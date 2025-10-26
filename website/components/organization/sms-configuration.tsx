"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { SMSProvider } from "@/lib/generated/prisma";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Form schemas
const createSmsConfigSchema = (provider: SMSProvider | null) => {
  const baseSchema = {
    apiKey: z.string().optional(),
    senderId: z.string().optional(),
    partnerId: z.string().optional(),
    userId: z.string().optional(),
    password: z.string().optional(),
  };

  if (provider === SMSProvider.TEXT_SMS) {
    return z.object({
      ...baseSchema,
      apiKey: z.string().min(1, "API Key is required for TextSMS"),
      senderId: z.string().min(1, "Sender ID is required for TextSMS"),
      partnerId: z.string().min(1, "Partner ID is required for TextSMS"),
    });
  }

  if (provider === SMSProvider.ZETATEL) {
    return z.object({
      ...baseSchema,
      apiKey: z.string().optional(), // API key is optional for Zettatel
      userId: z.string().min(1, "User ID is required for ZetaTel"),
      password: z.string().min(1, "Password is required for ZetaTel"),
      // Sender ID is supported by ZetaTel; keep optional to avoid breaking existing setups
      // Validation for required-ness can be enforced later server-side if needed
      senderId: z.string().optional(),
    });
  }

  return z.object(baseSchema);
};

const testSmsSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  message: z.string().optional(),
});

type SmsConfigFormData = {
  apiKey?: string;
  senderId?: string;
  partnerId?: string;
  userId?: string;
  password?: string;
};
type TestSmsFormData = z.infer<typeof testSmsSchema>;

interface SMSConfigurationProps {
  organizationId: string;
}

export const SMSConfiguration: React.FC<SMSConfigurationProps> = ({ organizationId }) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  
  const [selectedProvider, setSelectedProvider] = React.useState<SMSProvider | null>(null);
  const [showConfigForm, setShowConfigForm] = React.useState(false);
  const [showTestForm, setShowTestForm] = React.useState(false);

  // SMS Configuration Form
  const smsConfigForm = useForm<SmsConfigFormData>({
    resolver: zodResolver(createSmsConfigSchema(selectedProvider)),
    defaultValues: {
      apiKey: "",
      senderId: "",
      partnerId: "",
      userId: "",
      password: "",
    },
  });

  // Test SMS Form
  const testSmsForm = useForm<TestSmsFormData>({
    resolver: zodResolver(testSmsSchema),
    defaultValues: {
      phoneNumber: "",
      message: "",
    },
  });

  // Get organization data to check current SMS provider
  const { data: organization } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: organizationId })
  );

  // Get SMS configuration
  const { data: smsConfig, isLoading: configLoading } = useQuery(
    t.sms.getSmsConfiguration.queryOptions({ organizationId })
  );

  // Update SMS provider mutation
  const {
    mutate: updateSmsProvider,
    isPending: isUpdatingProvider,
  } = useMutation(
    t.sms.updateSmsProvider.mutationOptions({
      onSuccess: () => {
        toast.success("SMS provider updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationById.queryKey({ id: organizationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update SMS provider");
      },
    })
  );

  // Update SMS configuration mutation
  const {
    mutate: updateSmsConfig,
    isPending: isUpdatingConfig,
  } = useMutation(
    t.sms.updateSmsConfiguration.mutationOptions({
      onSuccess: () => {
        toast.success("SMS configuration updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.sms.getSmsConfiguration.queryKey({ organizationId }),
        });
        // Close the form after successful submission
        setShowConfigForm(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update SMS configuration");
      },
    })
  );

  // Test SMS mutation
  const {
    mutate: testSms,
    isPending: isTestingSms,
  } = useMutation(
    t.sms.testSmsConfiguration.mutationOptions({
      onSuccess: () => {
        toast.success("Test SMS sent successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send test SMS");
      },
    })
  );

  // Initialize form with existing config
  React.useEffect(() => {
    if (smsConfig) {
      smsConfigForm.reset({
        apiKey: smsConfig.apiKey || "",
        senderId: smsConfig.senderId || "",
        partnerId: smsConfig.partnerId || "",
        userId: smsConfig.userId || "",
        password: smsConfig.password || "",
      });
    }
  }, [smsConfig, smsConfigForm]);

  // Set selected provider from organization
  React.useEffect(() => {
    if (organization?.smsProvider) {
      setSelectedProvider(organization.smsProvider);
    }
  }, [organization]);

  // Update form resolver when provider changes
  React.useEffect(() => {
    smsConfigForm.clearErrors();
    // Note: We can't dynamically change the resolver in react-hook-form
    // The validation will be handled by the server-side validation
  }, [selectedProvider, smsConfigForm]);

  const handleProviderChange = (provider: SMSProvider) => {
    setSelectedProvider(provider);
    setShowConfigForm(false);
    setShowTestForm(false);
    updateSmsProvider({
      organizationId,
      smsProvider: provider,
    });
  };

  const handleConfigSubmit = (data: SmsConfigFormData) => {
    updateSmsConfig({
      organizationId,
      ...data,
    });
  };

  const handleTestSms = (data: TestSmsFormData) => {
    testSms({
      organizationId,
      phoneNumber: data.phoneNumber,
      message: data.message || undefined,
    });
  };

  const getProviderInfo = (provider: SMSProvider) => {
    switch (provider) {
      case SMSProvider.TEXT_SMS:
        return {
          name: "TextSMS",
          description: "Kenya's leading SMS provider with reliable delivery",
          website: "https://textsms.co.ke",
          requiredFields: ["API Key", "Sender ID", "Partner ID"],
          optionalFields: [],
        };
      case SMSProvider.ZETATEL:
        return {
          name: "ZetaTel",
          description: "Enterprise SMS solutions with advanced features. Supports API Key or User ID + Password authentication",
          website: "https://zetatel.com",
          requiredFields: ["User ID", "Password"],
          optionalFields: ["API Key", "Sender ID"],
        };
      default:
        return null;
    }
  };

  const providerInfo = selectedProvider ? getProviderInfo(selectedProvider) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">SMS Configuration</h3>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Provider</CardTitle>
          <CardDescription>
            Select your preferred SMS provider for sending notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-provider">SMS Provider</Label>
              <Select
                value={selectedProvider || ""}
                onValueChange={(value) => handleProviderChange(value as SMSProvider)}
                disabled={isUpdatingProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SMS provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SMSProvider.TEXT_SMS}>TextSMS</SelectItem>
                  <SelectItem value={SMSProvider.ZETATEL}>ZetaTel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {providerInfo && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>{providerInfo.name}</strong> - {providerInfo.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-medium">Required: </span>
                        {providerInfo.requiredFields.map((field, index) => (
                          <Badge key={index} variant="destructive" className="mr-1">
                            {field}
                          </Badge>
                        ))}
                      </div>
                      {providerInfo.optionalFields.length > 0 && (
                        <div>
                          <span className="text-sm font-medium">Optional: </span>
                          {providerInfo.optionalFields.map((field, index) => (
                            <Badge key={index} variant="secondary" className="mr-1">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Section */}
      {selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Configure your {providerInfo?.name} credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {smsConfig ? "Configuration is set up" : "No configuration found"}
                  </p>
                  {smsConfig && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Ready to send SMS</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowConfigForm(!showConfigForm)}
                  className="flex items-center gap-2"
                >
                  {showConfigForm ? (
                    <>
                      <X className="h-4 w-4" />
                      Hide Configuration
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {smsConfig ? "Edit Configuration" : "Configure"}
                    </>
                  )}
                </Button>
              </div>

              {showConfigForm && (
                <div className="border-t pt-4">
                  {configLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Form {...smsConfigForm}>
                      <form onSubmit={smsConfigForm.handleSubmit(handleConfigSubmit)} className="space-y-4">
                        {selectedProvider === SMSProvider.TEXT_SMS && (
                          <>
                            <FormField
                              control={smsConfigForm.control}
                              name="apiKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>API Key *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your TextSMS API key"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smsConfigForm.control}
                              name="senderId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sender ID *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your sender ID"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smsConfigForm.control}
                              name="partnerId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Partner ID *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your partner ID"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {selectedProvider === SMSProvider.ZETATEL && (
                          <>
                            <FormField
                              control={smsConfigForm.control}
                              name="senderId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sender ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your Sender ID (e.g. up to 11 chars)"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smsConfigForm.control}
                              name="userId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>User ID *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your ZetaTel user ID"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smsConfigForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="password"
                                      showPasswordToggle
                                      placeholder="Enter your ZetaTel password"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smsConfigForm.control}
                              name="apiKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>API Key (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter your ZetaTel API key (optional - alternative to User ID + Password)"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <div className="flex gap-2 pt-4">
                          <Button type="submit" disabled={isUpdatingConfig} className="flex items-center gap-2">
                            {isUpdatingConfig ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Save Configuration
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => smsConfigForm.reset()}
                            className="flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Reset
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test SMS Section */}
      {selectedProvider && smsConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Test SMS</CardTitle>
            <CardDescription>
              Send a test SMS to verify your configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Test your SMS configuration by sending a message
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowTestForm(!showTestForm)}
                  className="flex items-center gap-2"
                >
                  {showTestForm ? (
                    <>
                      <X className="h-4 w-4" />
                      Hide Test Form
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      Test SMS
                    </>
                  )}
                </Button>
              </div>

              {showTestForm && (
                <div className="border-t pt-4">
                  <Form {...testSmsForm}>
                    <form onSubmit={testSmsForm.handleSubmit(handleTestSms)} className="space-y-4">
                      <FormField
                        control={testSmsForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="254712345678"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={testSmsForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Test Message</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Test message from ISPinnacle"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit"
                        disabled={isTestingSms}
                        className="flex items-center gap-2"
                      >
                        {isTestingSms ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        Send Test SMS
                      </Button>
                    </form>
                  </Form>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      {selectedProvider && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {organization?.smsProvider ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  Provider: {organization?.smsProvider ? providerInfo?.name : "Not configured"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {smsConfig ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  Configuration: {smsConfig ? "Configured" : "Not configured"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
