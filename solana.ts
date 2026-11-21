/** Shared devnet helpers: the tip jar's client and "transfer + memo in one tx". */
import { readFileSync } from 'node:fs';
import { address, createClient, lamports } from '@solana/kit';
import { solanaDevnetRpc } from '@solana/kit-plugin-rpc';
import { signerFromFile } from '@solana/kit-plugin-signer';
import { systemProgram } from '@solana-program/system';
import { getAddMemoInstruction } from '@solana-program/memo';

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const explorerTx = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

export function loadTips(): Record<string, string> {
    return JSON.parse(readFileSync('./tips.json', 'utf8'));
}

export async function createTipClient() {
    return createClient()
        .use(signerFromFile('./devnet-keypair.json'))
        .use(solanaDevnetRpc())
        .use(systemProgram());
}

/** Send `sol` SOL to `to` with an optional memo, in a single transaction. Returns the signature. */
export async function sendSolWithMemo(to: string, sol: number, memo?: string): Promise<string> {
    const client = await createTipClient();
    const { context } = await client.sendTransaction([
        client.system.instructions.transferSol({
            source: client.payer,
            destination: address(to),
            amount: lamports(BigInt(Math.round(sol * LAMPORTS_PER_SOL))),
        }),
        ...(memo ? [getAddMemoInstruction({ memo, signers: [client.payer] })] : []),
    ]);
    return context.signature;
}
