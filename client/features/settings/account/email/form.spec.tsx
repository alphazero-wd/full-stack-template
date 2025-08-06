import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { EmailInputForm } from "./form";
import { Toaster } from "@/features/ui/toaster";
import { API_URL } from "@/constants";
import { server } from "@/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VALID_EMAIL = "foo@bar.com";

test("should display form", async () => {
  const component = render(<EmailInputForm email={VALID_EMAIL} />);
  expect(component).toBeDefined();
});

test("should prefill the input", async () => {
  render(<EmailInputForm email={VALID_EMAIL} />);
  expect(screen.getByLabelText(/email/i)).toHaveValue(VALID_EMAIL);
});

describe("validation is not successful", () => {
  it("should show an error if email is required", async () => {
    render(<EmailInputForm email={VALID_EMAIL} />);
    const initConfirmEmailChangeButton = screen.getByRole("button", {
      name: /update/i,
    });
    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.click(initConfirmEmailChangeButton);
    const emailErrorMessage = await screen.findByText(/email is required/i);
    expect(emailErrorMessage).toBeInTheDocument();
  });

  it("should show an error if email is not valid", async () => {
    render(<EmailInputForm email={VALID_EMAIL} />);
    const emailInput = screen.getByLabelText(/email/i);
    const initConfirmEmailChangeButton = screen.getByRole("button", {
      name: /update/i,
    });
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "abc@a");
    await userEvent.click(initConfirmEmailChangeButton);
    const emailErrorMessage = await screen.findByText(
      /invalid email provided/i
    );
    expect(emailErrorMessage).toBeInTheDocument();
  });
  it("should show an error if name hasn't changed", async () => {
    render(<EmailInputForm email={VALID_EMAIL} />);
    const updateEmailButton = screen.getByRole("button", { name: /update/i });
    await userEvent.click(updateEmailButton);
    const emailErrorMessage = await screen.findByText(
      /no changes made to your email/i
    );
    expect(emailErrorMessage).toBeInTheDocument();
  });
});

describe("validation is successful", () => {
  it("should display loading and disable the button until response is received", async () => {
    render(<EmailInputForm email={VALID_EMAIL} />);
    const emailInput = screen.getByLabelText(/email/i);
    const initConfirmEmailChangeButton = screen.getByRole("button", {
      name: /update/i,
    });
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "bob@bob.com");
    await userEvent.click(initConfirmEmailChangeButton);
    expect(initConfirmEmailChangeButton).toHaveTextContent("Updating...");
    expect(initConfirmEmailChangeButton).toBeDisabled();
  });

  describe("and sending is not successful", () => {
    it("should display form error message if 400 status code is received", async () => {
      server.use(
        http.patch(API_URL + "/settings/account/email", () => {
          return HttpResponse.json(
            { message: "Email already exists" },
            { status: 400 }
          );
        })
      );
      render(<EmailInputForm email={VALID_EMAIL} />);
      const emailInput = screen.getByLabelText(/email/i);
      const initConfirmEmailChangeButton = screen.getByRole("button", {
        name: /update/i,
      });
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "bob@bob.com");
      await userEvent.click(initConfirmEmailChangeButton);
      await waitFor(
        async () => {
          expect(
            await screen.findByText(/email already exists/i)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("should display error alert if some unexpected error occur", async () => {
      server.use(
        http.patch(API_URL + "/settings/account/email", () => {
          return HttpResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
          );
        })
      );
      render(
        <>
          <Toaster />
          <EmailInputForm email={VALID_EMAIL} />
        </>
      );
      const emailInput = screen.getByLabelText(/email/i);
      const initConfirmEmailChangeButton = screen.getByRole("button", {
        name: /update/i,
      });
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "bob@bob.com");
      await userEvent.click(initConfirmEmailChangeButton);
      await waitFor(
        async () => {
          expect(
            await screen.findByText(/email update failed/i)
          ).toBeInTheDocument();
          expect(
            await screen.findByText(/something went wrong/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display alert if the confirmation email is sent successfully", async () => {
      render(
        <>
          <Toaster />
          <EmailInputForm email={VALID_EMAIL} />
        </>
      );
      const emailInput = screen.getByLabelText(/email/i);
      const initConfirmEmailChangeButton = screen.getByRole("button", {
        name: /update/i,
      });
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "bob@bob.com");
      await userEvent.click(initConfirmEmailChangeButton);
      await waitFor(
        async () => {
          expect(
            await screen.findByText(/confirm your email/i)
          ).toBeInTheDocument();
          expect(
            await screen.findByText(
              "Click on the links sent to " + VALID_EMAIL + " and bob@bob.com"
            )
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
