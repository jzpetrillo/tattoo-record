import assert from "node:assert/strict";
import test from "node:test";
import {
  createPortfolioItemSchema,
  createPostSchema,
  updateUserSchema,
} from "../src/utils/validation";

const warning =
  "This media URL is from an unlisted domain and may be blocked by the browser's security policy";

test("accepts same-origin managed media URLs", () => {
  assert.equal(
    createPostSchema.safeParse({
      caption: "Fresh work",
      media: [{ publicId: "post/image", url: "/api/media/post/image", type: "image" }],
    }).success,
    true,
  );
});

test("accepts external media hosts on the browser allowlist", () => {
  assert.equal(
    updateUserSchema.safeParse({
      avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=Artist",
    }).success,
    true,
  );
});

test("rejects an image-only CSP host when the media is rendered as video", () => {
  const result = createPostSchema.safeParse({
    caption: "Video",
    media: [{
      publicId: "post/video",
      url: "https://picsum.photos/640/480",
      type: "video",
    }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, warning);
  }
});

test("rejects an allowlisted hostname on a non-default port", () => {
  const result = updateUserSchema.safeParse({
    avatarUrl: "https://api.dicebear.com:8443/9.x/initials/svg?seed=Artist",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, warning);
  }
});

test("warns before an unlisted portfolio media domain can be saved", () => {
  const result = createPortfolioItemSchema.safeParse({
    title: "Example",
    media: [{
      url: "https://imagedelivery.net/account/image/public",
      type: "image",
    }],
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, warning);
  }
});

test("warns before an unlisted avatar domain can be saved", () => {
  const result = updateUserSchema.safeParse({
    avatarUrl: "https://example.imgix.net/avatar.jpg",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.message, warning);
  }
});