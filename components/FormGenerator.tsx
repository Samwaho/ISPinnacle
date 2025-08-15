"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormGeneratorProps {
  fields: FormFieldConfig[];
  onSubmit: (data: Record<string, string | boolean | number>) => void;
  submitText?: string;
  title?: string;
  className?: string;
  // Styling options
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: number; // For grid layout
  fieldClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  buttonClassName?: string;
  cardClassName?: string;
  // Layout specific options
  showCard?: boolean;
  compact?: boolean;
  // Form options
  defaultValues?: Record<string, string | boolean | number>;
  mode?: "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all";
  // React Query integration
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function FormGenerator({ 
  fields, 
  onSubmit, 
  submitText = "Submit", 
  title,
  className = "",
  // Styling options
  layout = 'vertical',
  columns = 2,
  fieldClassName = "",
  labelClassName = "",
  inputClassName = "",
  errorClassName = "text-sm text-red-500",
  buttonClassName = "w-full",
  cardClassName = "",
  // Layout specific options
  showCard = true,
  compact = false,
  // Form options
  defaultValues = {},
  mode = "onBlur",
  // React Query integration
  isLoading = false,
  error: queryError = null,
  disabled = false
}: FormGeneratorProps) {

  // Generate Zod schema from fields
  const generateSchema = () => {
    const schemaObject: Record<string, z.ZodTypeAny> = {};
    
    fields.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (field.type) {
        case 'text':
        case 'password':
        case 'textarea':
          fieldSchema = z.string();
          break;
        case 'email':
          fieldSchema = z.string().email(field.validation?.message || "Invalid email address");
          break;
        case 'number':
          fieldSchema = z.string().transform((val: string) => {
            const num = Number(val);
            return isNaN(num) ? undefined : num;
          }).pipe(z.number().optional());
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'select':
        case 'radio':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }

      // Add required validation
      if (field.required) {
        fieldSchema = fieldSchema.refine((val: unknown) => {
          if (field.type === 'checkbox') {
            return val === true;
          }
          return val && val !== "";
        }, {
          message: `${field.label} is required`
        });
      }

      // Add custom validation
      if (field.validation) {
        const { min, max, pattern } = field.validation;
        
        if (min !== undefined) {
          fieldSchema = fieldSchema.refine((val: unknown) => {
            if (field.type === 'number') {
              return typeof val === 'number' && val >= min;
            }
            return typeof val === 'string' && val.length >= min;
          }, {
            message: `${field.label} must be at least ${min} ${field.type === 'number' ? '' : 'characters'}`
          });
        }
        
        if (max !== undefined) {
          fieldSchema = fieldSchema.refine((val: unknown) => {
            if (field.type === 'number') {
              return typeof val === 'number' && val <= max;
            }
            return typeof val === 'string' && val.length <= max;
          }, {
            message: `${field.label} must be no more than ${max} ${field.type === 'number' ? '' : 'characters'}`
          });
        }
        
        if (pattern) {
          fieldSchema = fieldSchema.refine((val: unknown) => {
            return typeof val === 'string' && new RegExp(pattern).test(val);
          }, {
            message: field.validation.message || `${field.label} format is invalid`
          });
        }
      }

      schemaObject[field.name] = fieldSchema;
    });

    return z.object(schemaObject);
  };

  const schema = generateSchema();
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as z.infer<typeof schema>,
    mode,
    disabled: disabled || isLoading
  });

  const handleSubmit = (data: z.infer<typeof schema>) => {
    onSubmit(data as Record<string, string | boolean | number>);
  };

  const renderField = (field: FormFieldConfig) => {
    const getFieldContainerClass = () => {
      const baseClass = fieldClassName || "space-y-2";
      if (layout === 'horizontal') {
        return `${baseClass} flex items-center space-x-4`;
      }
      if (layout === 'grid') {
        return `${baseClass}`;
      }
      return baseClass;
    };

    const getLabelClass = () => {
      const baseClass = labelClassName || "";
      if (layout === 'horizontal') {
        return `${baseClass} min-w-[120px] text-sm font-medium`;
      }
      return `${baseClass} text-sm font-medium`;
    };

    const getInputClass = () => {
      return inputClassName || "";
    };

    switch (field.type) {
              case 'text':
        case 'email':
        case 'password':
        case 'number':
          return (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as keyof z.infer<typeof schema>}
              render={({ field: formField }) => (
                <FormItem className={getFieldContainerClass()}>
                  <FormLabel className={getLabelClass()}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <div className={layout === 'horizontal' ? "flex-1" : ""}>
                    <FormControl>
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        className={getInputClass()}
                        value={String(formField.value || '')}
                        onChange={formField.onChange}
                        onBlur={formField.onBlur}
                        name={formField.name}
                        ref={formField.ref}
                      />
                    </FormControl>
                    <FormMessage className={errorClassName} />
                  </div>
                </FormItem>
              )}
            />
          );

              case 'textarea':
          return (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as keyof z.infer<typeof schema>}
              render={({ field: formField }) => (
                <FormItem className={getFieldContainerClass()}>
                  <FormLabel className={getLabelClass()}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <div className={layout === 'horizontal' ? "flex-1" : ""}>
                    <FormControl>
                      <Textarea
                        placeholder={field.placeholder}
                        className={getInputClass()}
                        value={String(formField.value || '')}
                        onChange={formField.onChange}
                        onBlur={formField.onBlur}
                        name={formField.name}
                        ref={formField.ref}
                      />
                    </FormControl>
                    <FormMessage className={errorClassName} />
                  </div>
                </FormItem>
              )}
            />
          );

        case 'select':
          return (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as keyof z.infer<typeof schema>}
              render={({ field: formField }) => (
                <FormItem className={getFieldContainerClass()}>
                  <FormLabel className={getLabelClass()}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <div className={layout === 'horizontal' ? "flex-1" : ""}>
                    <Select onValueChange={formField.onChange} value={String(formField.value || '')}>
                      <FormControl>
                        <SelectTrigger className={getInputClass()}>
                          <SelectValue placeholder={field.placeholder || "Select an option"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className={errorClassName} />
                  </div>
                </FormItem>
              )}
            />
          );

        case 'checkbox':
          return (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as keyof z.infer<typeof schema>}
              render={({ field: formField }) => (
                <FormItem className={getFieldContainerClass()}>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={Boolean(formField.value)}
                        onCheckedChange={formField.onChange}
                        className={getInputClass()}
                      />
                    </FormControl>
                    <FormLabel className={getLabelClass()}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                  </div>
                  <FormMessage className={errorClassName} />
                </FormItem>
              )}
            />
          );

        case 'radio':
          return (
            <FormField
              key={field.name}
              control={form.control}
              name={field.name as keyof z.infer<typeof schema>}
              render={({ field: formField }) => (
                <FormItem className={getFieldContainerClass()}>
                  <FormLabel className={getLabelClass()}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <div className={layout === 'horizontal' ? "flex-1" : ""}>
                    <FormControl>
                      <RadioGroup
                        onValueChange={formField.onChange}
                        value={String(formField.value || '')}
                      >
                        {field.options?.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option.value} 
                              id={`${field.name}-${option.value}`}
                              className={getInputClass()}
                            />
                            <Label htmlFor={`${field.name}-${option.value}`} className="text-sm font-normal">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className={errorClassName} />
                  </div>
                </FormItem>
              )}
            />
          );

      default:
        return null;
    }
  };

  const getFormContainerClass = () => {
    if (layout === 'grid') {
      return `grid grid-cols-1 md:grid-cols-${columns} gap-4`;
    }
    if (compact) {
      return "space-y-3";
    }
    return "space-y-4";
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={getFormContainerClass()}>
        {fields.map(renderField)}
        {queryError && (
          <div className={`${errorClassName} text-center`}>
            {queryError}
          </div>
        )}
        <div className={layout === 'grid' ? `col-span-1 md:col-span-${columns}` : ""}>
          <Button 
            type="submit" 
            className={buttonClassName} 
            disabled={form.formState.isSubmitting || isLoading || disabled}
          >
            {isLoading || form.formState.isSubmitting ? "Submitting..." : submitText}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (!showCard) {
    return (
      <div className={`${className} ${cardClassName}`}>
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {formContent}
      </div>
    );
  }

  return (
    <Card className={`${className} ${cardClassName}`}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
