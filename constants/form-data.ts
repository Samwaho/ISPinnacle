import { FormFieldConfig } from '@/components/FormGenerator'

export const loginFormData: FormFieldConfig[] = [
    {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
    },
    {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
    },
]