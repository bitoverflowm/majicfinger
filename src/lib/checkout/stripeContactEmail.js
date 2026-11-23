/**
 * In-app checkout collects email with Stripe's Contact Details Element (Link).
 *
 * Stripe rejects confirm() if Contact Details is mounted and updateEmail() was
 * already called: "If you intend to use the value from the Contact Details
 * Element, you should not call updateEmail()."
 *
 * Prefill a known login email with defaultValues at Checkout init — never
 * updateEmail() while the element is on the page. Hosted Checkout is a
 * separate Stripe page and does not use this helper.
 */

export function checkoutEmailDefaultValues(email) {
  const value = String(email || "").trim();
  return value ? { email: value } : null;
}

/** True once the session API has returned, so defaultValues.email is known at init. */
export function shouldInitCheckoutElements({ fatal, clientSecret, publishableKey, sessionId } = {}) {
  return !fatal && Boolean(clientSecret && publishableKey && sessionId);
}

export function buildCheckoutElementsOptions({ clientSecret, appearance, email, loader = "always" } = {}) {
  if (!clientSecret) return null;
  const defaultValues = checkoutEmailDefaultValues(email);
  return {
    clientSecret,
    elementsOptions: { appearance, loader },
    ...(defaultValues ? { defaultValues } : {}),
  };
}

/**
 * Contact Details owns email whenever it is mounted. updateEmail() is only
 * valid for a custom input after the element is unmounted.
 */
export function canCallUpdateEmail({ contactDetailsMounted } = {}) {
  return !contactDetailsMounted;
}

/** confirm() reads email from Contact Details; do not pass `email` here. */
export function checkoutConfirmOptions() {
  return { redirect: "if_required" };
}
