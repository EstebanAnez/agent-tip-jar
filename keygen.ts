/** Create ./devnet-keypair.json (the tip jar's sender wallet) if it doesn't exist. */
import { existsSync } from 'node:fs';
import { generateKeyPairSigner, writeKeyPairSigner } from '@solana/kit';

const PATH = './devnet-keypair.json';
if (existsSync(PATH)) {
    console.log(`${PATH} already exists, leaving it alone.`);
} else {
    const signer = await generateKeyPairSigner(true);
    await writeKeyPairSigner(signer, PATH);
    console.log(`Created ${PATH}`);
    console.log(`Sender address: ${signer.address}`);
    console.log('Fund it with devnet SOL at https://faucet.solana.com');
}
