import crypto from "crypto"

// LINE Webhook署名検証
export function validateSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64")
  return hash === signature
}
