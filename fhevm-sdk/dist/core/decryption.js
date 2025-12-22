/**
 * FHEVM Decryption - Universal SDK
 * EIP-712 signing + publicDecrypt implementation
 */
import { getFheInstance } from './fhevm.js';
/**
 * Request user decryption with EIP-712 signature
 */
export async function requestUserDecryption(contractAddress, signer, ciphertextHandle) {
    const relayer = getFheInstance();
    if (!relayer)
        throw new Error("FHEVM not initialized");
    const keypair = relayer.generateKeypair();
    const handleContractPairs = [
        {
            handle: ciphertextHandle,
            contractAddress: contractAddress,
        },
    ];
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const contractAddresses = [contractAddress];
    const eip712 = relayer.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
    const signature = await signer.signTypedData(eip712.domain, {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    }, eip712.message);
    const result = await relayer.userDecrypt(handleContractPairs, keypair.privateKey, keypair.publicKey, signature.replace("0x", ""), contractAddresses, await signer.getAddress(), startTimeStamp, durationDays);
    return result[ciphertextHandle];
}
/**
 * Public decryption for multiple handles
 */
export async function fetchPublicDecryption(handles) {
    const relayer = getFheInstance();
    if (!relayer)
        throw new Error("FHEVM not initialized");
    return relayer.publicDecrypt(handles);
}
