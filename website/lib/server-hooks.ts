"use server";
import { auth } from "@/auth";
import { prisma } from "./db";
import {
  MpesaTransactionType,
  OrganizationCustomerStatus,
  OrganizationPackageDurationType,
  OrganizationPermission,
  PaymentGateway,
  TransactionSource,
} from "@/lib/generated/prisma";
import { SmsService } from "./sms";

export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

export const getCurrentUserOrganization = async (id: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },
  });
  return organization;
};

export const getCurrentUserOrganizationMember = async (
  organizationId: string
) => {
  const session = await auth();
  if (!session?.user) return false;
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id!,
      },
    },
    include: {
      role: true,
    },
  });
  return member;
};

export const hasPermissions = async (
  organizationId: string,
  permissions: OrganizationPermission[]
) => {
  const session = await auth();
  if (!session?.user) return false;
  const organization = await getCurrentUserOrganization(organizationId);
  if (!organization) return false;
  const member = await getCurrentUserOrganizationMember(organizationId);
  if (!member) return false;
  return member.role?.permissions.some((permission) =>
    permissions.includes(permission)
  );
};

export const isOrganizationOwner = async (organizationId: string) => {
  const session = await auth();
  if (!session?.user) return false;
  const organization = await getCurrentUserOrganization(organizationId);
  if (!organization) return false;
  if (organization.ownerId === session.user.id) return true;
  return false;
};

export const createActivity = async (
  organizationId: string,
  userId: string,
  activity: string
) => {
  const newActivity = await prisma.organizationActivity.create({
    data: {
      organizationId,
      userId,
      activity,
    },
  });
  return newActivity;
};

export const processCustomerPayment = async (
  username: string,
  amount: number
) => {
  try {
    console.log("Processing payment for customer:", username, "Amount:", amount);

    const customer = await prisma.organizationCustomer.findFirst({
      where: {
        pppoeUsername: username,
      },
      include: {
        package: true,
        organization: true,
      },
    });

    if (!customer) {
      console.error("Customer not found for username:", username);
      throw new Error(`Customer not found for username: ${username}`);
    }

    console.log("Found customer:", customer.id);

    if (!customer.package) {
      console.error("Customer has no package assigned:", customer.id);
      throw new Error(`Customer ${username} has no package assigned`);
    }

    console.log("Customer package:", customer.package.id);

  await prisma.organizationCustomerPayment.create({
    data: {
      organizationId: customer.organizationId,
      customerId: customer.id,
      amount,
      packageId: customer.package.id,
    },
  });

  const packageAmount = customer.package.price;
  const packageDuration = customer.package.duration;
  const packageDurationType = customer.package.durationType;

  if (!packageAmount || !packageDuration || !packageDurationType) {
    throw new Error("Package configuration is incomplete");
  }

  // Convert package duration to days
  let packageDays = 0;
  if (packageDurationType === OrganizationPackageDurationType.MONTH) {
    packageDays = packageDuration * 30;
  } else if (packageDurationType === OrganizationPackageDurationType.YEAR) {
    packageDays = packageDuration * 365;
  } else if (packageDurationType === OrganizationPackageDurationType.WEEK) {
    packageDays = packageDuration * 7;
  } else if (packageDurationType === OrganizationPackageDurationType.DAY) {
    packageDays = packageDuration;
  } else if (packageDurationType === OrganizationPackageDurationType.HOUR) {
    packageDays = packageDuration / 24;
  } else if (packageDurationType === OrganizationPackageDurationType.MINUTE) {
    packageDays = packageDuration / 1440;
  }

  let daysToAdd = 0;

  // Check if amount equals package price
  if (amount === packageAmount) {
    // Exact payment - add full package duration
    daysToAdd = packageDays;
  } else {
    // Calculate proportional duration based on amount paid
    const ratio = amount / packageAmount;
    daysToAdd = packageDays * ratio;
  }

  // Calculate new expiry date from current time (when payment is made)
  const currentTime = new Date();
  const newExpiry = new Date(
    currentTime.getTime() + daysToAdd * 24 * 60 * 60 * 1000
  );

  // Update customer expiry date
  const updatedCustomer = await prisma.organizationCustomer.update({
    where: {
      id: customer.id,
    },
    data: {
      expiryDate: newExpiry,
      status: OrganizationCustomerStatus.ACTIVE,
    },
  });

  await SmsService.sendPaymentConfirmation(
    customer.organizationId,
    customer.phone,
    amount.toString(),
    customer.package.name,
    newExpiry.toDateString(),
    customer.organization.name
  );

    return updatedCustomer;
  } catch (error) {
    console.error("Error in processCustomerPayment:", error);
    throw error;
  }
};

export const storeMpesaTransaction = async (
  transactionId: string,
  amount: number,
  transactionType: MpesaTransactionType,
  transactionDateTime: Date,
  shortCode: string,
  name: string,
  phoneNumber: string,
  billReferenceNumber: string,
  invoiceNumber: string,
  orgAccountBalance: number,
  paymentGateway: PaymentGateway = PaymentGateway.MPESA,
  source: TransactionSource = TransactionSource.OTHER,
) => {
  try {
    console.log("Looking for organization with shortCode:", shortCode);

    // First find the M-Pesa configuration
    const mpesaConfig = await prisma.mpesaConfiguration.findFirst({
      where: {
        shortCode: shortCode,
      },
    });

    if (!mpesaConfig) {
      console.error("M-Pesa configuration not found for shortCode:", shortCode);
      throw new Error(`M-Pesa configuration not found for shortCode: ${shortCode}`);
    }

    // Then get the organization
    const organization = await prisma.organization.findUnique({
      where: {
        id: mpesaConfig.organizationId,
      },
    });

    if (!organization) {
      console.error("Organization not found for organizationId:", mpesaConfig.organizationId);
      throw new Error(`Organization not found for organizationId: ${mpesaConfig.organizationId}`);
    }

    console.log("Found organization:", organization.id);
    console.log("Found M-Pesa configuration:", mpesaConfig.id);

    // Coerce potentially numeric values from upstream into strings for Prisma
    const safeName = typeof name === 'string' ? name : (name != null ? String(name) : null);
    const safePhone = typeof phoneNumber === 'string' ? phoneNumber : (phoneNumber != null ? String(phoneNumber) : '');

    const newTransaction = await prisma.transaction.create({
      data: {
        organizationId: organization.id,
        transactionId: transactionId,
        amount: amount,
        transactionType: transactionType,
        transactionDateTime: transactionDateTime,
        name: safeName,
        phoneNumber: safePhone,
        billReferenceNumber: billReferenceNumber,
        invoiceNumber: invoiceNumber,
        orgAccountBalance: orgAccountBalance,
        paymentGateway,
        source,
      },
    });

    console.log("M-Pesa transaction created:", newTransaction.id);
    return newTransaction;
  } catch (error) {
    console.error("Error in storeMpesaTransaction:", error);
    throw error;
  }
};

// Store a Kopo Kopo buygoods transaction by resolving organization from K2 till number
export const storeKopoKopoTransaction = async (
  transactionId: string,
  amount: number,
  transactionDateTime: Date,
  tillNumber: string,
  name: string,
  phoneNumber: string,
  billReferenceNumber: string,
  invoiceNumber: string,
  orgAccountBalance: number = 0,
  source: TransactionSource = TransactionSource.OTHER,
) => {
  try {
    console.log("Looking for organization with Kopo Kopo tillNumber:", tillNumber);

    const k2Config = await prisma.kopokopoConfiguration.findFirst({
      where: { tillNumber },
    });

    if (!k2Config) {
      console.error("Kopo Kopo configuration not found for tillNumber:", tillNumber);
      throw new Error(`Kopo Kopo configuration not found for tillNumber: ${tillNumber}`);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: k2Config.organizationId },
    });

    if (!organization) {
      console.error("Organization not found for organizationId:", k2Config.organizationId);
      throw new Error(`Organization not found for organizationId: ${k2Config.organizationId}`);
    }

    const safeName = typeof name === 'string' ? name : (name != null ? String(name) : null);
    const safePhone = typeof phoneNumber === 'string' ? phoneNumber : (phoneNumber != null ? String(phoneNumber) : '');

    const newTransaction = await prisma.transaction.create({
      data: {
        organizationId: organization.id,
        transactionId,
        amount,
        transactionType: MpesaTransactionType.BUYGOODS,
        transactionDateTime,
        name: safeName,
        phoneNumber: safePhone,
        billReferenceNumber,
        invoiceNumber: `K2-${invoiceNumber || transactionId}`,
        orgAccountBalance,
        paymentGateway: PaymentGateway.KOPOKOPO,
        source,
      },
    });

    console.log("Kopo Kopo transaction stored in MpesaTransaction:", newTransaction.id);
    return newTransaction;
  } catch (error) {
    console.error("Error in storeKopoKopoTransaction:", error);
    throw error;
  }
};

