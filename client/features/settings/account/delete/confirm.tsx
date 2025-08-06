"use client";
import { Button } from "@/features/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/ui/dialog";
import { Input } from "@/features/ui/input";
import { Label } from "@/features/ui/label";
import { Form, FormField, FormItem, FormMessage } from "@/features/ui/form";
import { useDeleteAccount } from "./use-delete";
import { Spinner } from "@/features/ui/spinner";

export const ConfirmDeleteDialog = () => {
  const { isDialogOpen, onDialogOpen, onDialogClose, loading, onSubmit, form } =
    useDeleteAccount();

  return (
    <Dialog open={isDialogOpen} onOpenChange={onDialogClose}>
      <Button onClick={onDialogOpen} variant="destructive">
        Delete account
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete account confirmation</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and your associated data on My App.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="password" className="block">
                    To confirm, type in your password
                  </Label>
                  <Input type="password" id="password" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-3 border-t pt-4">
              <Button
                disabled={loading}
                type="button"
                variant="outline"
                onClick={onDialogClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                variant="destructive"
                className="gap-x-2"
              >
                {loading && <Spinner />} {loading ? "Deleting..." : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
