/**
 * Tiny x402-style paid API on Solana devnet: npm run server
 *
 * GET /fortune without payment -> 402 with { price, payTo, memo nonce }.
 * GET /fortune with X-Payment: <tx signature> -> verifies on devnet that the tx
 * paid >= price to payTo with the matching memo nonce, then returns a fortune.
 * Nonces are single-use and signatures can't be reused.
 */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createSolanaRpc, signature as toSignature } from '@solana/kit';
import { LAMPORTS_PER_SOL, loadTips } from './solana.ts';

const PORT = Number(process.env.PORT ?? 4021);
const PRICE_SOL = 0.001;
const PRICE_LAMPORTS = BigInt(PRICE_SOL * LAMPORTS_PER_SOL);
const PAY_TO = loadTips().test;
const NONCE_TTL_MS = 5 * 60_000;
const SYSTEM = '11111111111111111111111111111111';
const MEMO = 'Memo4c2pN8afCj432Lb7RMVKi9PbQnnW7ewFFaV3oAH';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
const openNonces = new Map<string, number>(); // nonce -> issuedAt
const usedSignatures = new Set<string>();

const FORTUNES = [
    'A small tip today compounds into a big thank you tomorrow.',
    'Your next transaction will finalize faster than you expect.',
    'The best agents pay their own way.',
    'Fortune favors the well-funded devnet wallet.',
];

type Instruction = { programId: string; parsed?: unknown };
type ParsedTx = {
    meta: { err: unknown } | null;
    transaction: { message: { instructions: Instruction[] } };
};

async function fetchTx(sig: string): Promise<ParsedTx | null> {
    // The payer confirms before retrying, but give the RPC a moment to catch up.
    for (let i = 0; i < 10; i++) {
        const tx = await rpc
            .getTransaction(toSignature(sig), {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 1,
                encoding: 'jsonParsed',
            })
            .send();
        if (tx) return tx as unknown as ParsedTx;
        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

/** Returns null if the payment is valid, otherwise a reason it was rejected. */
async function verifyPayment(sig: string): Promise<string | null> {
    const tx = await fetchTx(sig);
    if (!tx) return 'transaction not found on devnet';
    if (tx.meta?.err) return 'transaction failed onchain';

    const ixs = tx.transaction.message.instructions;
    const paid = ixs.some(ix => {
        const p = ix.parsed as { type?: string; info?: { destination?: string; lamports?: string | number } };
        return (
            ix.programId === SYSTEM &&
            p?.type === 'transfer' &&
            p.info?.destination === PAY_TO &&
            BigInt(p.info?.lamports ?? 0) >= PRICE_LAMPORTS
        );
    });
    if (!paid) return `no transfer of at least ${PRICE_SOL} SOL to ${PAY_TO}`;

    const memo = ixs.find(ix => ix.programId === MEMO)?.parsed;
    if (typeof memo !== 'string') return 'missing memo';
    const issuedAt = openNonces.get(memo);
    if (issuedAt === undefined) return 'memo nonce unknown or already used';
    if (Date.now() - issuedAt > NONCE_TTL_MS) return 'memo nonce expired';
    openNonces.delete(memo);
    return null;
}

const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body, null, 2));
};

createServer(async (req, res) => {
    if (req.method !== 'GET' || req.url !== '/fortune') return json(res, 404, { error: 'not found' });

    const payment = req.headers['x-payment'];
    if (typeof payment !== 'string' || !payment) {
        const memo = randomBytes(8).toString('hex');
        openNonces.set(memo, Date.now());
        return json(res, 402, {
            error: 'payment required',
            price: PRICE_SOL,
            currency: 'SOL',
            network: 'solana-devnet',
            payTo: PAY_TO,
            memo,
            howToPay: 'Send price to payTo with memo in one tx, then retry with header X-Payment: <signature>',
        });
    }

    if (usedSignatures.has(payment)) return json(res, 402, { error: 'payment signature already used' });
    usedSignatures.add(payment); // reserve before the async check so parallel replays fail
    try {
        const reason = await verifyPayment(payment);
        if (reason) {
            usedSignatures.delete(payment);
            return json(res, 402, { error: `payment rejected: ${reason}` });
        }
    } catch (err) {
        usedSignatures.delete(payment);
        return json(res, 502, { error: `could not verify payment: ${(err as Error).message}` });
    }
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    console.log(`✅ paid request ${payment.slice(0, 8)}… served`);
    return json(res, 200, { fortune, paidWith: payment });
}).listen(PORT, () => {
    console.log(`🔮 Paid fortune API on http://localhost:${PORT}/fortune`);
    console.log(`   price ${PRICE_SOL} SOL on devnet, payTo ${PAY_TO}`);
});
