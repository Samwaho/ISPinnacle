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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  Clock
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { defaultSmsTemplates } from "@/lib/default-data";

// Form schemas
const smsTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  message: z.string().min(1, "Message is required"),
  variables: z.array(z.string()),
  isActive: z.boolean(),
});

const sendTemplateSmsSchema = z.object({
  organizationId: z.string(),
  templateName: z.string(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  variables: z.record(z.string(), z.string()),
});

type SendTemplateSmsFormData = z.infer<typeof sendTemplateSmsSchema>;

interface SmsTemplateProps {
  organizationId: string;
}

export const SmsTemplate: React.FC<SmsTemplateProps> = ({ organizationId }) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<{
    id: string;
    name: string;
    message: string;
    variables: string[];
    isActive: boolean;
  } | null>(null);
  const [deletingTemplate, setDeletingTemplate] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sendingTemplate, setSendingTemplate] = React.useState<{
    id: string;
    name: string;
    message: string;
    variables: string[];
  } | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [previewMessage, setPreviewMessage] = React.useState("");

  // SMS Template Form
  const smsTemplateForm = useForm({
    resolver: zodResolver(smsTemplateSchema),
    defaultValues: {
      name: "",
      message: "",
      variables: [] as string[],
      isActive: true,
    },
  });

  // Send Template SMS Form
  const sendTemplateForm = useForm<SendTemplateSmsFormData>({
    resolver: zodResolver(sendTemplateSmsSchema),
    defaultValues: {
      organizationId,
      templateName: "",
      phoneNumber: "",
      variables: {},
    },
  });

  // Get organization data
  const { data: organization } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: organizationId })
  );

  // Get SMS templates
  const { data: templates, isLoading: templatesLoading } = useQuery(
    t.sms.getSmsTemplates.queryOptions({ organizationId })
  );

  // Create SMS template mutation
  const {
    mutate: createTemplate,
    isPending: isCreatingTemplate,
  } = useMutation(
    t.sms.createSmsTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("SMS template created successfully");
        queryClient.invalidateQueries({
          queryKey: t.sms.getSmsTemplates.queryKey({ organizationId }),
        });
        setShowCreateForm(false);
        smsTemplateForm.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create SMS template");
      },
    })
  );

  // Update SMS template mutation
  const {
    mutate: updateTemplate,
    isPending: isUpdatingTemplate,
  } = useMutation(
    t.sms.updateSmsTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("SMS template updated successfully");
        queryClient.invalidateQueries({
          queryKey: t.sms.getSmsTemplates.queryKey({ organizationId }),
        });
        setEditingTemplate(null);
        smsTemplateForm.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update SMS template");
      },
    })
  );

  // Delete SMS template mutation
  const {
    mutate: deleteTemplate,
    isPending: isDeletingTemplate,
  } = useMutation(
    t.sms.deleteSmsTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("SMS template deleted successfully");
        queryClient.invalidateQueries({
          queryKey: t.sms.getSmsTemplates.queryKey({ organizationId }),
        });
        setDeletingTemplate(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete SMS template");
      },
    })
  );

  // Send template SMS mutation
  const {
    mutate: sendTemplateSms,
    isPending: isSendingTemplate,
  } = useMutation(
    t.sms.sendTemplateSms.mutationOptions({
      onSuccess: () => {
        toast.success("Template SMS sent successfully");
        setSendingTemplate(null);
        sendTemplateForm.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send template SMS");
      },
    })
  );

  // Create default templates mutation
  const {
    mutate: createDefaultTemplates,
    isPending: isCreatingDefaults,
  } = useMutation(
    t.sms.createDefaultTemplates.mutationOptions({
      onSuccess: () => {
        toast.success("Default SMS templates created successfully");
        queryClient.invalidateQueries({
          queryKey: t.sms.getSmsTemplates.queryKey({ organizationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create default templates");
      },
    })
  );

  // Initialize form with editing template data
  React.useEffect(() => {
    if (editingTemplate) {
      smsTemplateForm.reset({
        name: editingTemplate.name,
        message: editingTemplate.message,
        variables: editingTemplate.variables,
        isActive: editingTemplate.isActive,
      });
    }
  }, [editingTemplate, smsTemplateForm]);

  // Initialize send form with sending template data
  React.useEffect(() => {
    if (sendingTemplate) {
      const initialVariables = Object.fromEntries(
        (sendingTemplate.variables || []).map((v) => [v, ""])
      );
      sendTemplateForm.reset({
        organizationId,
        templateName: sendingTemplate.name,
        phoneNumber: "",
        variables: initialVariables,
      });
    }
  }, [sendingTemplate, sendTemplateForm, organizationId]);

  const handleCreateTemplate = (data: { name: string; message: string; variables: string[]; isActive: boolean }) => {
    createTemplate({
      organizationId,
      ...data,
    });
  };

  const handleUpdateTemplate = (data: { name: string; message: string; variables: string[]; isActive: boolean }) => {
    if (editingTemplate) {
      updateTemplate({
        id: editingTemplate.id,
        organizationId,
        ...data,
      });
    }
  };

  const handleDeleteTemplate = (template: { id: string; name: string }) => {
    setDeletingTemplate({
      id: template.id,
      name: template.name,
    });
  };

  const handleEditTemplate = (template: {
    id: string;
    name: string;
    message: string;
    variables: string[];
    isActive: boolean;
  }) => {
    setEditingTemplate(template);
  };

  const handleSendTemplate = (template: {
    id: string;
    name: string;
    message: string;
    variables: string[];
  }) => {
    setSendingTemplate(template);
  };

  const handleSendTemplateSms = (data: SendTemplateSmsFormData) => {
    sendTemplateSms(data);
  };

  const handleCreateDefaults = () => {
    if (organization) {
      createDefaultTemplates({
        organizationId,
        organizationName: organization.name,
        supportNumber: organization.phone || "+254700000000",
      });
    }
  };

  const handlePreviewMessage = (message: string, variables: string[]) => {
    let preview = message;
    variables.forEach(variable => {
      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), `[${variable}]`);
      preview = preview.replace(new RegExp(`\\{${variable}\\}`, 'g'), `[${variable}]`);
    });
    setPreviewMessage(preview);
    setShowPreview(true);
  };

  const getTemplateIcon = (templateName: string) => {
    switch (templateName) {
      case "welcome_message":
        return <Users className="h-4 w-4" />;
      case "customer_expiry_reminder":
        return <Clock className="h-4 w-4" />;
      case "payment_confirmation":
        return <CheckCircle className="h-4 w-4" />;
      case "service_suspension":
        return <XCircle className="h-4 w-4" />;
      case "service_restoration":
        return <CheckCircle className="h-4 w-4" />;
      case "maintenance_notice":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTemplateDescription = (templateName: string) => {
    switch (templateName) {
      case "welcome_message":
        return "Welcome new customers with account details";
      case "customer_expiry_reminder":
        return "Remind customers about package expiration";
      case "payment_confirmation":
        return "Confirm successful payments";
      case "service_suspension":
        return "Notify customers about service suspension";
      case "service_restoration":
        return "Notify customers about service restoration";
      case "maintenance_notice":
        return "Inform customers about scheduled maintenance";
      default:
        return "Custom SMS template";
    }
  };

  const hasDefaultTemplates = templates?.some(template => 
    defaultSmsTemplates.some(defaultTemplate => defaultTemplate.name === template.name)
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="text-lg font-semibold">SMS Templates</h3>
        </div>
        <div className="flex gap-2">
          {!hasDefaultTemplates && (
            <Button
              variant="outline"
              onClick={handleCreateDefaults}
              disabled={isCreatingDefaults}
              className="flex items-center gap-2"
            >
              {isCreatingDefaults ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Defaults
            </Button>
          )}
          <Button
            variant="gradient"
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>
            Manage your SMS templates for automated customer communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (templates && Array.isArray(templates) && templates.length > 0) ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-100 text-blue-600">
                      {getTemplateIcon(template.name)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.isActive ? (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{getTemplateDescription(template.name)}</p>
                      {template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.variables.map((variable, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewMessage(template.message, template.variables)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendTemplate(template)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">Create your first SMS template to get started</p>
              <Button
                variant="gradient"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateForm || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setShowCreateForm(false);
          setEditingTemplate(null);
          smsTemplateForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update your SMS template settings and content"
                : "Create a new SMS template for customer communications"
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...smsTemplateForm}>
            <form 
              onSubmit={smsTemplateForm.handleSubmit(editingTemplate ? handleUpdateTemplate : handleCreateTemplate)} 
              className="space-y-4"
            >
              <FormField
                control={smsTemplateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., welcome_message, payment_confirmation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={smsTemplateForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Template</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your message template. Use {{variableName}} for dynamic content..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={smsTemplateForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable this template for use
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isCreatingTemplate || isUpdatingTemplate}
                  className="flex items-center gap-2"
                >
                  {(isCreatingTemplate || isUpdatingTemplate) ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingTemplate(null);
                    smsTemplateForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Send Template SMS Dialog */}
      <Dialog open={!!sendingTemplate} onOpenChange={(open) => {
        if (!open) {
          setSendingTemplate(null);
          sendTemplateForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Template SMS</DialogTitle>
            <DialogDescription>
              Send a template SMS to a specific phone number
            </DialogDescription>
          </DialogHeader>
          <Form {...sendTemplateForm}>
            <form 
              onSubmit={sendTemplateForm.handleSubmit(handleSendTemplateSms)} 
              className="space-y-4"
            >
              <FormField
                control={sendTemplateForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="254712345678"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {sendingTemplate?.variables.map((variable) => (
                <FormField
                  key={variable}
                  control={sendTemplateForm.control}
                  name={`variables.${variable}`}
                  defaultValue=""
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{variable}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`Enter ${variable}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSendingTemplate}
                  className="flex items-center gap-2"
                >
                  {isSendingTemplate ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send SMS
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setSendingTemplate(null);
                    sendTemplateForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Message Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              Preview how your template message will look
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{previewMessage}</p>
            </div>
            <Button onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingTemplate}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={() => {
          if (deletingTemplate) {
            deleteTemplate({
              id: deletingTemplate.id,
              organizationId,
            });
          }
        }}
        title="Delete Template"
        description={`Are you sure you want to delete the template "${deletingTemplate?.name}"? This action cannot be undone.`}
        isLoading={isDeletingTemplate}
        variant="destructive"
      />
    </div>
  );
};
