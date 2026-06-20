"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Field } from "./field";
import { EyeIcon, EyeOffIcon } from "@/app/_components/icons";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
};

export function PasswordField({ label, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      label={label}
      id={id}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-tint-soft hover:text-foreground"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      }
      {...props}
    />
  );
}
