function validateAction(action) {
  return Boolean(
    action &&
      typeof action === "object" &&
      typeof action.intent === "string" &&
      action.intent.trim(),
  );
}

export { validateAction };
