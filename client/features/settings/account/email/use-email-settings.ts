import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/features/ui/use-toast";
import { initEmailChangeConfirmation } from "./init-email-change";
import { isAxiosError } from "axios";
import { timeout } from "@/features/common/utils";

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email provided" }),
});

export const useEmailSettings = (email: string) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    form.setValue("email", email);
  }, [email]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.email === email) {
      form.setError("email", { message: "No changes made to your email" });
      return;
    }
    setLoading(true);
    await timeout();
    await sendConfirmationEmail(values.email);
  };

  const sendConfirmationEmail = async (newEmail: string) => {
    try {
      await initEmailChangeConfirmation(newEmail);

      toast({
        variant: "info",
        title: "Confirm your email",
        description: "Click on the links sent to " + email + " and " + newEmail,
      });
    } catch (error: any) {
      if (isAxiosError(error) && error.response?.status === 400)
        form.setError("email", { message: error.response.data.message });
      else
        toast({
          variant: "error",
          title: "Email update failed!",
          description: isAxiosError(error)
            ? error.response?.data.message
            : error.message,
        });
    } finally {
      setLoading(false);
    }
  };

  return {
    onSubmit,
    loading,
    form,
  };
};
