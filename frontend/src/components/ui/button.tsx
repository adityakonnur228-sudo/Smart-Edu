"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "quiet"
  | "ai";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "default",
      loading = false,
      disabled,
      href,
      icon,
      iconRight,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = ["button"];

    if (variant === "primary") baseClasses.push("primary");
    else if (variant === "secondary") baseClasses.push("secondary");
    else if (variant === "outline") baseClasses.push("outline");
    else if (variant === "ghost") baseClasses.push("ghost");
    else if (variant === "danger") baseClasses.push("danger");
    else if (variant === "quiet") baseClasses.push("quiet");
    else if (variant === "ai") baseClasses.push("ai");

    if (size === "sm") baseClasses.push("btn-sm");
    else if (size === "lg") baseClasses.push("btn-lg");
    else if (size === "icon") baseClasses.push("btn-icon");
    else if (size === "icon-sm") baseClasses.push("btn-icon-sm");
    else baseClasses.push("btn-default");

    if (className) baseClasses.push(className);

    const loaderSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

    const content = (
      <span className="inline-flex items-center justify-center gap-2 leading-none whitespace-nowrap">
        {loading && <Loader2 size={loaderSize} className="animate-spin shrink-0" aria-hidden="true" />}
        {!loading && icon && <span className="inline-flex items-center justify-center shrink-0">{icon}</span>}
        {children && <span className="inline-flex items-center justify-center gap-1.5 leading-none whitespace-nowrap">{children}</span>}
        {!loading && iconRight && <span className="inline-flex items-center justify-center shrink-0">{iconRight}</span>}
      </span>
    );

    if (href) {
      return (
        <Link
          href={href}
          className={baseClasses.join(" ")}
          style={style}
          aria-busy={loading}
          aria-disabled={disabled || loading}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={props.type || "button"}
        disabled={disabled || loading}
        aria-busy={loading}
        className={baseClasses.join(" ")}
        style={style}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
