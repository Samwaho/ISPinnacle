import { prisma } from "@/lib/db";
import { SMSProvider } from "@/lib/generated/prisma";
import { defaultSmsTemplates } from "./default-data";

interface SmsConfiguration {
  id: string;
  organizationId: string;
  apiKey: string | null;
  senderId: string | null;
  partnerId: string | null;
  userId: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendSmsParams {
  organizationId: string;
  phoneNumber: string;
  message: string;
}

export interface SendTemplateSmsParams {
  organizationId: string;
  templateName: string;
  phoneNumber: string;
  variables: Record<string, string>;
}

export interface CreateDefaultTemplatesParams {
  organizationId: string;
  organizationName: string;
  supportNumber: string;
}

export interface SmsResponse {
  success: boolean;
  message: string;
  response?: unknown;
  error?: string;
}

export class SmsService {
  /**
   * Send SMS using the organization's configured SMS provider
   */
  static async sendSms(params: SendSmsParams): Promise<SmsResponse> {
    const { organizationId, phoneNumber, message } = params;

    try {
      // Get organization and SMS configuration
      const [organization, configuration] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { smsProvider: true },
        }),
        prisma.sMSConfiguration.findUnique({
          where: { organizationId },
        }),
      ]);

      if (!organization?.smsProvider) {
        return {
          success: false,
          message: "SMS provider not configured for this organization",
          error: "NO_PROVIDER_CONFIGURED",
        };
      }

      if (!configuration) {
        return {
          success: false,
          message: "SMS configuration not found for this organization",
          error: "NO_CONFIGURATION",
        };
      }

      const smsProvider = organization.smsProvider;

      // Send SMS based on provider
      switch (smsProvider) {
        case SMSProvider.TEXT_SMS:
          return await this.sendTextSms(configuration, phoneNumber, message);
        
        case SMSProvider.ZETATEL:
          return await this.sendZetaTelSms(configuration, phoneNumber, message);
        
        default:
          return {
            success: false,
            message: `SMS provider ${smsProvider} is not implemented`,
            error: "PROVIDER_NOT_IMPLEMENTED",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to send SMS: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "SEND_FAILED",
      };
    }
  }

  /**
   * Send SMS using TextSMS provider
   */
  private static async sendTextSms(
    configuration: SmsConfiguration,
    phoneNumber: string,
    message: string
  ): Promise<SmsResponse> {
    try {
      // Validate required fields for TextSMS
      if (!configuration.apiKey || !configuration.senderId || !configuration.partnerId) {
        return {
          success: false,
          message: "TextSMS configuration is incomplete. Missing API Key, Sender ID, or Partner ID",
          error: "INCOMPLETE_CONFIGURATION",
        };
      }

      const response = await fetch("https://sms.textsms.co.ke/api/services/sendsms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: configuration.apiKey,
          partnerID: configuration.partnerId,
          message: message,
          shortcode: configuration.senderId,
          mobile: phoneNumber,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `TextSMS API request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();


      // Check for success - TextSMS returns 200 for success
      if (result.responses && result.responses[0] && result.responses[0]["response-code"] === 200) {
        return {
          success: true,
          message: "SMS sent successfully via TextSMS",
          response: result,
        };
      } else {
        const errorMessage = result.responses?.[0]?.["response-description"] || "Failed to send SMS";
        return {
          success: false,
          message: `TextSMS error: ${errorMessage}`,
          error: "SMS_SEND_FAILED",
          response: result,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `TextSMS service error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "SERVICE_ERROR",
      };
    }
  }

  /**
   * Send SMS using ZetaTel provider
   */
  private static async sendZetaTelSms(
    configuration: SmsConfiguration,
    phoneNumber: string,
    message: string
  ): Promise<SmsResponse> {
    try {
      // Validate required fields for ZetaTel
      const hasUserCredentials = configuration.userId && configuration.userId.trim() !== "" && 
                                configuration.password && configuration.password.trim() !== "";
      
      if (!hasUserCredentials) {
        return {
          success: false,
          message: "ZetaTel configuration is incomplete. User ID and Password are required",
          error: "INCOMPLETE_CONFIGURATION",
        };
      }

      // Prepare request body
      const requestBody = new URLSearchParams({
        sendMethod: "quick",
        mobile: phoneNumber,
        msg: message,
        senderid: configuration.senderId || "SENDER",
        msgType: "text",
        duplicatecheck: "true",
        output: "json",
        userid: configuration.userId!,
        password: configuration.password!,
      });

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        "cache-control": "no-cache",
      };

      // Add API key as header if provided
      if (configuration.apiKey && configuration.apiKey.trim() !== "") {
        headers["apikey"] = configuration.apiKey;
      }

      const response = await fetch("https://portal.zettatel.com/SMSApi/send", {
        method: "POST",
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        return {
          success: false,
          message: `ZetaTel API request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();

      // Check if the response indicates success
      if (result.status === "success" && result.statusCode === "200") {
        return {
          success: true,
          message: "SMS sent successfully via ZetaTel",
          response: result,
        };
      } else {
        const errorMessage = result.reason || "Failed to send SMS";
        return {
          success: false,
          message: `ZetaTel error: ${errorMessage}`,
          error: "SMS_SEND_FAILED",
          response: result,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `ZetaTel service error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "SERVICE_ERROR",
      };
    }
  }

  /**
   * Send SMS using a template with variables
   */
  static async sendTemplateSms(params: SendTemplateSmsParams): Promise<SmsResponse> {
    const { organizationId, templateName, phoneNumber, variables } = params;

    try {
      // Get the template
      const template = await prisma.sMSTemplate.findFirst({
        where: {
          organizationId,
          name: templateName,
          isActive: true,
        },
      });

      if (!template) {
        return {
          success: false,
          message: `SMS template '${templateName}' not found or inactive`,
          error: "TEMPLATE_NOT_FOUND",
        };
      }

      // Process the template with variables
      const processedMessage = this.processTemplate(template.message, template.variables, variables);

      if (!processedMessage.success) {
        return {
          success: false,
          message: processedMessage.message,
          error: "TEMPLATE_PROCESSING_FAILED",
        };
      }

      // Send the SMS with the processed message
      return await this.sendSms({
        organizationId,
        phoneNumber,
        message: processedMessage.message,
      });
    } catch (error) {
      return {
        success: false,
        message: `Failed to send template SMS: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "SERVICE_ERROR",
      };
    }
  }

  /**
   * Process a template message with variables
   */
  private static processTemplate(
    template: string,
    templateVariables: string[],
    providedVariables: Record<string, string>
  ): { success: boolean; message: string; error?: string } {
    try {
      let processedMessage = template;

      // Check if all required variables are provided
      const missingVariables = templateVariables.filter(
        variable => !(variable in providedVariables)
      );

      if (missingVariables.length > 0) {
        return {
          success: false,
          message: `Missing required variables: ${missingVariables.join(", ")}`,
          error: "MISSING_VARIABLES",
        };
      }

      // Replace variables in the template
      // Support both {{variable}} and {variable} syntax
      for (const [key, value] of Object.entries(providedVariables)) {
        const patterns = [
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'), // {{variable}}
          new RegExp(`\\{${key}\\}`, 'g'),      // {variable}
        ];

        for (const pattern of patterns) {
          processedMessage = processedMessage.replace(pattern, value);
        }
      }

      return {
        success: true,
        message: processedMessage,
      };
    } catch (error) {
      return {
        success: false,
        message: `Template processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "PROCESSING_ERROR",
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  static async sendBulkSms(
    organizationId: string,
    recipients: Array<{ phoneNumber: string; message: string }>
  ): Promise<SmsResponse[]> {
    const results: SmsResponse[] = [];

    for (const recipient of recipients) {
      const result = await this.sendSms({
        organizationId,
        phoneNumber: recipient.phoneNumber,
        message: recipient.message,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Send bulk SMS using templates
   */
  static async sendBulkTemplateSms(
    organizationId: string,
    templateName: string,
    recipients: Array<{ phoneNumber: string; variables: Record<string, string> }>
  ): Promise<SmsResponse[]> {
    const results: SmsResponse[] = [];

    for (const recipient of recipients) {
      const result = await this.sendTemplateSms({
        organizationId,
        templateName,
        phoneNumber: recipient.phoneNumber,
        variables: recipient.variables,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Get SMS delivery status (for providers that support it)
   */
  static async getDeliveryStatus(
    organizationId: string,
    messageId: string
  ): Promise<SmsResponse> {
    try {
      const [organization, configuration] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { smsProvider: true },
        }),
        prisma.sMSConfiguration.findUnique({
          where: { organizationId },
        }),
      ]);

      if (!organization?.smsProvider) {
        return {
          success: false,
          message: "SMS provider not configured",
          error: "NO_PROVIDER_CONFIGURED",
        };
      }

      if (!configuration) {
        return {
          success: false,
          message: "SMS configuration not found",
          error: "NO_CONFIGURATION",
        };
      }

      const smsProvider = organization.smsProvider;

      switch (smsProvider) {
        case SMSProvider.TEXT_SMS:
          return await this.getTextSmsDeliveryStatus(configuration, messageId);
        
        case SMSProvider.ZETATEL:
          return await this.getZetaTelDeliveryStatus(configuration, messageId);
        
        default:
          return {
            success: false,
            message: `Delivery status not supported for provider ${smsProvider}`,
            error: "NOT_SUPPORTED",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get delivery status: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "STATUS_CHECK_FAILED",
      };
    }
  }

  /**
   * Get delivery status from TextSMS
   */
  private static async getTextSmsDeliveryStatus(
    configuration: SmsConfiguration,
    messageId: string
  ): Promise<SmsResponse> {
    try {
      const response = await fetch("https://sms.textsms.co.ke/api/services/getdlr/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: configuration.apiKey,
          partnerID: configuration.partnerId,
          messageID: messageId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `TextSMS delivery status request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: "Delivery status retrieved successfully",
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get delivery status: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "STATUS_CHECK_FAILED",
      };
    }
  }

  /**
   * Get account balance (for providers that support it)
   */
  static async getAccountBalance(
    organizationId: string
  ): Promise<SmsResponse> {
    try {
      const [organization, configuration] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { smsProvider: true },
        }),
        prisma.sMSConfiguration.findUnique({
          where: { organizationId },
        }),
      ]);

      if (!organization?.smsProvider) {
        return {
          success: false,
          message: "SMS provider not configured",
          error: "NO_PROVIDER_CONFIGURED",
        };
      }

      if (!configuration) {
        return {
          success: false,
          message: "SMS configuration not found",
          error: "NO_CONFIGURATION",
        };
      }

      const smsProvider = organization.smsProvider;

      switch (smsProvider) {
        case SMSProvider.TEXT_SMS:
          return await this.getTextSmsAccountBalance(configuration);
        
        case SMSProvider.ZETATEL:
          return await this.getZetaTelAccountBalance(configuration);
        
        default:
          return {
            success: false,
            message: `Account balance not supported for provider ${smsProvider}`,
            error: "NOT_SUPPORTED",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get account balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "BALANCE_CHECK_FAILED",
      };
    }
  }

  /**
   * Get account balance from TextSMS
   */
  private static async getTextSmsAccountBalance(configuration: SmsConfiguration): Promise<SmsResponse> {
    try {
      const response = await fetch("https://sms.textsms.co.ke/api/services/getbalance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: configuration.apiKey,
          partnerID: configuration.partnerId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: `TextSMS balance request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: "Account balance retrieved successfully",
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get account balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "BALANCE_CHECK_FAILED",
      };
    }
  }

  /**
   * Get delivery status from ZetaTel
   */
  private static async getZetaTelDeliveryStatus(
    configuration: SmsConfiguration,
    messageId: string
  ): Promise<SmsResponse> {
    try {
      // Validate required fields for ZetaTel
      const hasUserCredentials = configuration.userId && configuration.userId.trim() !== "" && 
                                configuration.password && configuration.password.trim() !== "";
      
      if (!hasUserCredentials) {
        return {
          success: false,
          message: "ZetaTel configuration is incomplete. User ID and Password are required",
          error: "INCOMPLETE_CONFIGURATION",
        };
      }

      // Prepare request body for delivery report
      const requestBody = new URLSearchParams({
        userid: configuration.userId!,
        password: configuration.password!,
        transactionId: messageId,
        output: "json",
      });

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        "cache-control": "no-cache",
      };

      // Add API key as header if provided
      if (configuration.apiKey && configuration.apiKey.trim() !== "") {
        headers["apikey"] = configuration.apiKey;
      }

      const response = await fetch("https://portal.zettatel.com/SMSApi/getdlr", {
        method: "POST",
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        return {
          success: false,
          message: `ZetaTel delivery status request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: "Delivery status retrieved successfully",
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get delivery status: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "STATUS_CHECK_FAILED",
      };
    }
  }

  /**
   * Get account balance from ZetaTel
   */
  private static async getZetaTelAccountBalance(configuration: SmsConfiguration): Promise<SmsResponse> {
    try {
      // Validate required fields for ZetaTel
      const hasUserCredentials = configuration.userId && configuration.userId.trim() !== "" && 
                                configuration.password && configuration.password.trim() !== "";
      
      if (!hasUserCredentials) {
        return {
          success: false,
          message: "ZetaTel configuration is incomplete. User ID and Password are required",
          error: "INCOMPLETE_CONFIGURATION",
        };
      }

      // Prepare request body for account status
      const requestBody = new URLSearchParams({
        userid: configuration.userId!,
        password: configuration.password!,
        output: "json",
      });

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
        "cache-control": "no-cache",
      };

      // Add API key as header if provided
      if (configuration.apiKey && configuration.apiKey.trim() !== "") {
        headers["apikey"] = configuration.apiKey;
      }

      const response = await fetch("https://portal.zettatel.com/SMSApi/getaccountstatus", {
        method: "POST",
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        return {
          success: false,
          message: `ZetaTel account status request failed with status ${response.status}`,
          error: "API_REQUEST_FAILED",
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: "Account balance retrieved successfully",
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get account balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "BALANCE_CHECK_FAILED",
      };
    }
  }

  /**
   * Create default SMS templates for an organization
   */
  static async createDefaultTemplates(params: CreateDefaultTemplatesParams): Promise<SmsResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizationId, organizationName: _organizationName, supportNumber: _supportNumber } = params;

    try {
      const createdTemplates = [];

      for (const template of defaultSmsTemplates) {
        // Check if template already exists
        const existingTemplate = await prisma.sMSTemplate.findFirst({
          where: {
            organizationId,
            name: template.name,
          },
        });

        if (!existingTemplate) {
          const createdTemplate = await prisma.sMSTemplate.create({
            data: {
              organizationId,
              name: template.name,
              message: template.message, // Store original template with variables
              variables: template.variables,
              isActive: template.isActive,
            },
          });

          createdTemplates.push(createdTemplate);
        }
      }

      return {
        success: true,
        message: `Created ${createdTemplates.length} default SMS templates`,
        response: {
          createdTemplates,
          totalTemplates: defaultSmsTemplates.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create default templates: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: "TEMPLATE_CREATION_FAILED",
      };
    }
  }

  /**
   * Send welcome message to a new customer
   */
  static async sendWelcomeMessage(
    organizationId: string,
    phoneNumber: string,
    customerName: string,
    username: string,
    password: string,
    organizationName: string,
    supportNumber: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "welcome_message",
      phoneNumber,
      variables: {
        organizationName,
        username,
        password,
        supportNumber,
      },
    });
  }

  /**
   * Send customer expiry reminder
   */
  static async sendExpiryReminder(
    organizationId: string,
    phoneNumber: string,
    customerName: string,
    expiryDate: string,
    organizationName: string,
    supportNumber: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "customer_expiry_reminder",
      phoneNumber,
      variables: {
        customerName,
        expiryDate,
        supportNumber,
        organizationName,
      },
    });
  }

  /**
   * Send payment confirmation
   */
  static async sendPaymentConfirmation(
    organizationId: string,
    phoneNumber: string,
    amount: string,
    packageName: string,
    expiryDate: string,
    organizationName: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "payment_confirmation",
      phoneNumber,
      variables: {
        amount,
        packageName,
        expiryDate,
        organizationName,
      },
    });
  }

  /**
   * Send payment link to customer
   */
  static async sendPaymentLink(
    organizationId: string,
    phoneNumber: string,
    customerName: string,
    amount: string,
    packageName: string,
    paymentLink: string,
    organizationName: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "payment_link",
      phoneNumber,
      variables: {
        customerName,
        amount,
        packageName,
        paymentLink,
        organizationName,
      },
    });
  }

  /**
   * Send service suspension notice
   */
  static async sendServiceSuspension(
    organizationId: string,
    phoneNumber: string,
    customerName: string,
    organizationName: string,
    supportNumber: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "service_suspension",
      phoneNumber,
      variables: {
        customerName,
        supportNumber,
        organizationName,
      },
    });
  }

  /**
   * Send service restoration notice
   */
  static async sendServiceRestoration(
    organizationId: string,
    phoneNumber: string,
    customerName: string,
    organizationName: string,
    supportNumber: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "service_restoration",
      phoneNumber,
      variables: {
        customerName,
        supportNumber,
        organizationName,
      },
    });
  }

  /**
   * Send maintenance notice
   */
  static async sendMaintenanceNotice(
    organizationId: string,
    phoneNumber: string,
    maintenanceDate: string,
    startTime: string,
    endTime: string,
    organizationName: string
  ): Promise<SmsResponse> {
    return await this.sendTemplateSms({
      organizationId,
      templateName: "maintenance_notice",
      phoneNumber,
      variables: {
        maintenanceDate,
        startTime,
        endTime,
        organizationName,
      },
    });
  }
}
