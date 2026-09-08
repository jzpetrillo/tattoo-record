import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getAdminBookingItems,
  getAdminBookingsUrl,
  terminalBookingStatuses,
} from "../src/lib/admin-bookings";

const paginatedResponse = {
  items: [
    { id: "completed-later-page", status: "COMPLETED" },
    { id: "cancelled-later-page", status: "CANCELLED" },
    { id: "pending-booking", status: "PENDING" },
  ],
  page: 2,
  totalPages: 2,
};

describe("admin booking status filter", () => {
  for (const status of terminalBookingStatuses) {
    test(`selecting ${status} requests and displays only ${status} bookings`, () => {
      assert.equal(getAdminBookingsUrl(status), `/api/admin/bookings?status=${status}`);

      const visibleBookings = getAdminBookingItems(paginatedResponse, status);

      assert.deepEqual(visibleBookings, [
        { id: `${status.toLowerCase()}-later-page`, status },
      ]);
    });
  }
});