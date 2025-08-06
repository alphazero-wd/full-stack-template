"use client";
import { Label } from "@/features/ui/label";
import { Button } from "@/features/ui/button";
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/features/ui/form";
import { Input } from "@/features/ui/input";
import { Spinner } from "@/features/ui/spinner";
import { useBasicInfoForm } from "./use-basic-info";
import { NAME_MAX_LENGTH } from "@/constants";

interface BasicInfoFormProps {
  name: string;
}

export const BasicInfoForm = ({ name }: BasicInfoFormProps) => {
  const { form, loading, onSubmit, cancelChanges } = useBasicInfoForm({ name });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="name">Your name</Label>
              <Input
                disabled={loading}
                {...field}
                isInvalid={form.getFieldState("name").invalid}
                id="name"
                placeholder="Max"
              />
              <FormDescription>
                {Math.max(NAME_MAX_LENGTH - field.value.length, 0)} characters
                remaining
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-x-4">
          <Button
            disabled={loading}
            variant="outline"
            type="button"
            className="w-fit"
            onClick={cancelChanges}
          >
            Reset
          </Button>
          <Button disabled={loading} className="w-fit gap-x-2" type="submit">
            {loading && <Spinner />} {loading ? "Updating..." : "Update"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
