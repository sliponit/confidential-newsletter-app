/**
 * Pinata IPFS upload client
 */

export interface UploadMetadata {
  iv: string;
  encryptedContent: string;
  title: string;
  subtitle: string;
  date: string;
}

export interface UploadResult {
  cid: string;
  url: string;
}

/**
 * Upload encrypted content to Pinata IPFS
 * @param data - The metadata object to upload
 * @param jwt - Pinata JWT token
 * @returns Object containing the CID and gateway URL
 */
export async function uploadToPinata(
  data: UploadMetadata,
  jwt: string
): Promise<UploadResult> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });

  const formData = new FormData();
  formData.append('file', blob, 'newsletter.json');

  // Add Pinata metadata
  formData.append(
    'pinataMetadata',
    JSON.stringify({
      name: `newsletter-${data.date}`,
    })
  );

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return {
    cid: result.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
  };
}
