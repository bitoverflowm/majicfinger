import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  buildCheckoutElementsOptions,
  canCallUpdateEmail,
  checkoutConfirmOptions,
  checkoutEmailDefaultValues,
  shouldInitCheckoutElements,
} from "./stripeContactEmail.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("prefill uses defaultValues, not updateEmail", () => {
  assert.deepEqual(checkoutEmailDefaultValues("wardsgate3@gmail.com"), { email: "wardsgate3@gmail.com" });
  assert.equal(checkoutEmailDefaultValues("  "), null);
  assert.equal(checkoutEmailDefaultValues(""), null);
  assert.equal(checkoutEmailDefaultValues(null), null);

  const withEmail = buildCheckoutElementsOptions({
    clientSecret: "cs_test_secret",
    appearance: { theme: "stripe" },
    email: "wardsgate3@gmail.com",
  });
  assert.equal(withEmail.clientSecret, "cs_test_secret");
  assert.deepEqual(withEmail.defaultValues, { email: "wardsgate3@gmail.com" });
  assert.equal(withEmail.elementsOptions.loader, "always");

  const guest = buildCheckoutElementsOptions({
    clientSecret: "cs_test_secret",
    appearance: {},
    email: "",
  });
  assert.equal("defaultValues" in guest, false);
});

test("Contact Details mounted means never call updateEmail before confirm", () => {
  assert.equal(canCallUpdateEmail({ contactDetailsMounted: true }), false);
  assert.equal(canCallUpdateEmail({ contactDetailsMounted: false }), true);
  assert.deepEqual(checkoutConfirmOptions({ contactDetailsMounted: true }), { redirect: "if_required" });
  assert.equal("email" in checkoutConfirmOptions({ contactDetailsMounted: true }), false);
});

test("Checkout Elements waits for the session so email is known at init", () => {
  const secret = Promise.resolve("cs_test_secret");
  assert.equal(
    shouldInitCheckoutElements({
      fatal: null,
      clientSecret: secret,
      publishableKey: "pk_test",
      sessionId: "",
    }),
    false,
  );
  assert.equal(
    shouldInitCheckoutElements({
      fatal: null,
      clientSecret: secret,
      publishableKey: "pk_test",
      sessionId: "cs_test_123",
    }),
    true,
  );
  assert.equal(
    shouldInitCheckoutElements({
      fatal: "session",
      clientSecret: secret,
      publishableKey: "pk_test",
      sessionId: "cs_test_123",
    }),
    false,
  );
});

test("CheckoutClient does not call updateEmail while Contact Details is mounted", () => {
  const clientPath = fileURLToPath(new URL("../../components/checkout/CheckoutClient.jsx", import.meta.url));
  const src = fs.readFileSync(clientPath, "utf8");
  assert.match(src, /ContactDetailsElement/);
  assert.match(src, /checkout\.confirm\(checkoutConfirmOptions\(\)\)/);
  assert.equal(/\.updateEmail\s*\(/.test(src), false);
  assert.match(src, /shouldInitCheckoutElements/);
  assert.match(src, /buildCheckoutElementsOptions/);
});

test("lite weekly, legacy, and other cycles share Contact Details as email owner", () => {
  const plans = ["lite", "researcher", "quant", "basic", "pro", "elite"];
  const cycles = ["weekly", "monthly", "annual"];
  for (const plan of plans) {
    for (const cycle of cycles) {
      assert.equal(
        canCallUpdateEmail({ contactDetailsMounted: true, plan, cycle }),
        false,
        `${plan} ${cycle}`,
      );
    }
  }
  for (const plan of ["lifetime", "mcp_prereg", "jarvis"]) {
    assert.equal(canCallUpdateEmail({ contactDetailsMounted: true, plan }), false, plan);
  }
});
