import React from "react";

export default function IconButton({
  ariaLabel,
  className = "",
  title,
  children,
  ...props
}) {
  const resolvedTitle = title || ariaLabel;
  const classes = ["icon-button", className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={resolvedTitle}
      className={classes}
      {...props}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
