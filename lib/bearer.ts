import { safeEqual } from "@/lib/crypto";

export async function verifyBearer(
  authorization: string | null | undefined,
  expectedToken: string,
): Promise<boolean> {
  if (!authorization) {
    await safeEqual("", expectedToken);
    return false;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  if (!match) {
    await safeEqual(authorization, expectedToken);
    return false;
  }

  return safeEqual(match[1], expectedToken);
}
