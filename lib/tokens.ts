import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { prisma } from "./db";

export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  const existingToken = await prisma.verificationToken.findFirst({
    where: {
      email,
    },
  });
  if (existingToken) {
    await prisma.verificationToken.delete({
      where: {
        id: existingToken.id,
      },
    });
  }
  const newToken = await prisma.verificationToken.create({
    data: {
      email,
      token,
      expires,
    },
  });
  return newToken;
};

export const generatePasswordResetToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  const existingToken = await prisma.passwordResetToken.findFirst({
    where: {
      email,
    },
  });
  if (existingToken) {
    await prisma.passwordResetToken.delete({
      where: {
        id: existingToken.id,
      },
    });
  }
  const passwordResetToken = await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires,
    },
  });
  return passwordResetToken;
};

export const generateTwoFactorToken = async (email: string) => {
  const token = crypto.randomInt(100000, 1000000).toString();
  const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes

  const existingToken = await prisma.twoFactorToken.findFirst({
    where: {
      email,
    },
  });
  if (existingToken) {
    await prisma.twoFactorToken.delete({
      where: {
        id: existingToken.id,
      },
    });
  }
  const twoFactorToken = await prisma.twoFactorToken.create({
    data: {
      email,
      token,
      expires,
    },
  });
  return twoFactorToken;
};

export const generateTwoFactorConfirmation = async (userId: string) => {
  const confirmation = await prisma.twoFactorConfirmation.create({
    data: {
      userId,
    },
  });
  return confirmation;
};
