# Checkout Flow - Complete Analysis

## Overview

The checkout flow in MotoGT is a server-side rendered (SSR) process that converts cart items into orders. It requires authentication, handles address selection, payment method selection, promo code application, and order creation through backend API calls.

---

## 1. Authentication & Authorization

### Middleware Protection
- **File**: `app/routes/_main.checkout.tsx`
- **Middleware**: `requireAuthMiddleware` is applied to the checkout route
- **Effect**: Users must be authenticated to access the checkout page
- **Implementation**: 
  ```typescript
  export const middleware: MiddlewareFunction[] = [requireAuthMiddleware];
  ```

### Token Management
- **File**: `app/lib/api-client.ts`
- **Request Interceptor**: Automatically adds `Authorization: Bearer {token}` header to all API requests
- **Token Source**: Extracted from `accessTokenCookie` via `document.cookie` (client-side) or request headers (server-side)
- **Token Refresh**: Automatic 401 handling with token refresh mechanism

---

## 2. Data Loading (Server-Side)

### Loader Function
**Location**: `app/routes/_main.checkout.tsx` (lines 21-56)

The loader runs on the server before the page renders and fetches:

1. **Cart Contents** (`getApiStoresByStoreIdCart`)
   - **Endpoint**: `GET /api/stores/{storeId}/cart`
   - **Authentication**: Required (Bearer token)
   - **Returns**: 
     - Cart items with product details
     - Cart summary (subtotal, item count, etc.)
   - **Error Handling**: Returns `null` if fetch fails

2. **User Addresses** (`getApiUsersMeAddresses`)
   - **Endpoint**: `GET /api/users/me/addresses`
   - **Query Params**: `page: 1, limit: 20`
   - **Authentication**: Required (Bearer token)
   - **Returns**: Array of user's saved addresses
   - **Error Handling**: Returns empty array `[]` if fetch fails (graceful degradation)

### Parallel Fetching
Both API calls are executed in parallel using `Promise.all()` for optimal performance.

```typescript
const [cartResponse, addressesResponse] = await Promise.all([
  getApiStoresByStoreIdCart({ ... }),
  getApiUsersMeAddresses({ ... })
]);
```

---

## 3. Cart Management

### Cart Data Structure
**Source**: Backend API response from `GET /api/stores/{storeId}/cart`

```typescript
{
  items: Array<{
    productId: string;
    productName: string;
    productImage: string;
    unitPrice: number;
    quantity: number;
  }>;
  summary: {
    subtotal: number;
    itemCount: number;
    // ... other summary fields
  };
}
```

### Cart State
- **Initial State**: Loaded from server via loader
- **No Client-Side Updates**: The checkout page doesn't modify cart items (that's handled in the cart page)
- **Read-Only**: Cart items are displayed but not editable on checkout page

### Empty Cart Handling
If `cartItems.length === 0`, the page displays:
- Empty state message
- "Continue Shopping" link back to home page
- No checkout form is shown

---

## 4. Address Selection

### Address Data Structure
**Source**: `GET /api/users/me/addresses`

```typescript
{
  id: string;
  title: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}
```

### Address Selection UI
- **Component**: `AddressSelectionCard` (lines 507-542)
- **Display**: Radio group with visual cards showing:
  - Address title
  - "Default" badge if applicable
  - Address line 1
  - Clickable selection with visual feedback (ring border when selected)
- **Default Selection**: Automatically selects default address if available
- **Add New Address**: Link to `/profile/address/add` for adding new addresses

### State Management
- **State Variable**: `selectedAddress` (string - address ID)
- **Default Value**: Empty string, then set to default address ID on mount
- **Validation**: Required before order placement

---

## 5. Payment Method Selection

### Available Payment Methods
1. **Cash on Delivery** (`cod`)
   - Frontend ID: `"cod"`
   - API Value: `"cash_on_delivery"`
   - Icon: `/pay-cash.svg`

2. **Card on Delivery** (`card_on_delivery`)
   - Frontend ID: `"card_on_delivery"`
   - API Value: `"cash_on_delivery"` (workaround - API doesn't support this enum)
   - Note: Stored in `notes` field as `"Payment method: Card on Delivery"`
   - Icon: `/pay-card-pos.svg`

3. **Pay with CliQ** (`cliq`)
   - Frontend ID: `"cliq"`
   - API Value: `"digital_wallet"` (API enum requirement)
   - Note: Stored in `notes` field as `"Payment method: Pay with CliQ"`
   - Icon: `/pay-cliq.svg`

4. **Credit/Debit Card** (`card`)
   - Frontend ID: `"card"`
   - API Value: `"credit_card"`
   - Status: **Disabled** ("Coming soon")
   - Icon: CreditCard icon (grayed out)

### Payment Method Mapping
**Function**: `getPaymentMethodValue()` (lines 173-186)

Maps frontend payment IDs to API enum values:
- `"cod"` → `"cash_on_delivery"`
- `"card_on_delivery"` → `"cash_on_delivery"` (with note)
- `"cliq"` → `"digital_wallet"` (with note)
- `"card"` → `"credit_card"`

**Why the workaround?**
The API enum only accepts: `cash_on_delivery`, `bank_transfer`, `credit_card`, `digital_wallet`
- CliQ is a digital wallet, so we send `"digital_wallet"` and store the actual method in `notes`
- Card on Delivery isn't in the enum, so we use `"cash_on_delivery"` and store the actual method in `notes`

### Payment Method UI
- **Component**: `PaymentMethodCard` (lines 558-605)
- **Display**: Radio group with visual cards
- **Selection**: Visual feedback with ring border and background color change
- **Default**: `"cod"` (Cash on Delivery)

---

## 6. Promo Code System

### Promo Code Storage
- **Location**: `localStorage` with key `"motogt_applied_promo_code"`
- **Persistence**: Survives page refreshes
- **Sync**: Automatically saved when applied, removed when order is placed

### Valid Promo Codes
**Hardcoded in frontend** (lines 58-61):
```typescript
const VALID_PROMO_CODES: Record<string, number> = {
  "10%off": 10,    // 10% discount
  "test123": 50,   // 50% discount
};
```

### Promo Code Flow

1. **Application** (`handleApplyPromoCode`, lines 94-115):
   - Validates code exists and isn't already applied
   - Checks against `VALID_PROMO_CODES`
   - Saves to `localStorage` and state
   - Shows success toast

2. **Removal** (`handleRemovePromoCode`, lines 118-125):
   - Clears from state and `localStorage`
   - Shows success toast

3. **Calculation** (`calculateTotals`, lines 140-168):
   - Calculates discount: `(subtotal * discountPercent) / 100`
   - Applies to total: `total = subtotal + shipping - discountAmount`

4. **Order Placement**:
   - Promo codes are sent to backend in `checkoutData.promoCodes` array
   - Backend validates and applies discounts
   - **Important**: Backend calculates final discount (frontend calculation is for display only)

### Promo Code UI
- **Input Field**: Text input with "Apply" button
- **Applied State**: Green badge showing code and discount percentage with remove button
- **Error State**: Red error message below input
- **Keyboard Support**: Enter key applies code

---

## 7. Order Summary Calculation

### Calculation Function
**Location**: `calculateTotals()` (lines 140-168)

### Calculation Logic

1. **Subtotal**:
   ```typescript
   if (cart?.summary) {
     subtotal = cart.summary.subtotal;  // From backend
   } else {
     subtotal = cartItems.reduce(
       (sum, item) => sum + (item.unitPrice * item.quantity),
       0
     );
   }
   ```

2. **Discount**:
   ```typescript
   if (appliedPromoCode && VALID_PROMO_CODES[appliedPromoCode]) {
     const discountPercent = VALID_PROMO_CODES[appliedPromoCode];
     discountAmount = (subtotal * discountPercent) / 100;
   }
   ```

3. **Shipping**: Always `0` (Free shipping)

4. **Total**:
   ```typescript
   total = subtotal + shippingCost - discountAmount;
   ```

### Display
- Subtotal: From backend or calculated
- Shipping: "Free" (always 0)
- Discount: Only shown if > 0
- Total: Final amount

**Note**: Frontend calculations are for display only. Backend recalculates everything during order creation.

---

## 8. Order Placement

### Order Placement Function
**Location**: `handlePlaceOrder()` (lines 188-230)

### Process Flow

1. **Validation**:
   - Checks `selectedAddress` is set
   - Checks `selectedPayment` is set
   - If missing, function returns early

2. **Data Preparation**:
   ```typescript
   const checkoutData = {
     storeId: defaultParams.storeId,
     shippingAddressId: selectedAddress,
     paymentMethod: getPaymentMethodValue(selectedPayment),
     notes: "...",  // If CliQ or Card on Delivery
     promoCodes: [appliedPromoCode],  // If promo code applied
   };
   ```

3. **API Call**:
   - Uses `checkoutMutation.mutate()` from React Query
   - Mutation defined in `app/lib/queries.ts` (lines 266-280)
   - Calls `POST /api/checkout` with `checkoutData`

4. **Success Handling**:
   - Clears promo code from `localStorage`
   - Invalidates React Query cache for `["orders"]` and `["cart"]`
   - Shows success toast: "Order placed successfully!"
   - Navigates to `/profile/orders`

5. **Error Handling**:
   - Shows error toast: "Failed to place order. Please try again."
   - Logs error to console
   - Loading state is reset

### Loading State
- `loading` state variable controls button disabled state
- Button shows "Placing Order..." with spinner during request

---

## 9. Backend API Integration

### Checkout API Endpoint
**Endpoint**: `POST /api/checkout`
**Location**: `app/lib/client/sdk.gen.ts` (lines 1179-1194)

### Request Schema
**Type**: `CheckoutRequest` (from `app/lib/client/types.gen.ts`)

```typescript
{
  storeId: string;                    // Required
  shippingAddressId?: string;          // UUID
  billingAddressId?: string;           // UUID
  notes?: string;                      // Max 1000 chars
  languageId?: string;                 // UUID
  validateStock?: boolean;             // Default: true
  paymentMethod?: 'cash_on_delivery' | 'bank_transfer' | 'credit_card' | 'digital_wallet';
  promoCodes?: string[];               // Array of promo code strings
  shippingMethod?: 'standard' | 'express';  // Default: 'standard'
}
```

### Response Schema
**Type**: `CheckoutResponse` (from `app/lib/client/types.gen.ts`)

```typescript
{
  success: boolean;
  data: {
    id: string;                       // Order ID
    orderNumber: string;               // e.g., "JO-2025-000045"
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
    userId: string;
    userEmail: string;
    userFirstName: string;
    userLastName: string;
    items: Array<{...}>;               // Order items
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: 'JOD' | 'AED' | 'USD' | ...;
    shippingAddress: {...} | null;
    billingAddress: {...} | null;
    notes: string | null;
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
    itemCount: number;
    totalQuantity: number;
  };
}
```

### Backend Responsibilities
According to API documentation:
- **🔒 SECURITY**: All amounts (tax, shipping, discount) are calculated **ONLY on the backend**
- Frontend cannot override these values
- Backend validates:
  - Stock availability (if `validateStock: true`)
  - Promo code validity and applicability
  - Address ownership (user must own the address)
  - Cart contents (items must exist in user's cart)

### Mutation Configuration
**Location**: `app/lib/queries.ts` (lines 266-280)

```typescript
export const checkoutMutationOptions = mutationOptions({
  mutationFn: async (data: CheckoutRequest) => {
    await postApiCheckout({ body: data });
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["orders"] });
    context.client.invalidateQueries({ queryKey: ["cart"] });
    toast.success("Order placed successfully!");
  },
  onError: () => {
    toast.error("Failed to place order. Please try again.");
  },
});
```

---

## 10. Error Handling

### Loader Errors
- **Cart Fetch Failure**: Returns `cart: null`, page shows empty cart state
- **Address Fetch Failure**: Returns `addresses: []`, user can still add new address

### Order Placement Errors
- **Network Errors**: Caught in `catch` block, shows alert
- **API Errors**: Handled by React Query mutation `onError`, shows toast
- **Validation Errors**: Backend returns error response, mutation fails

### User Feedback
- **Success**: Toast notification + navigation
- **Error**: Toast notification + console logging
- **Loading**: Button disabled + spinner + "Placing Order..." text

---

## 11. State Management

### React State Variables
1. `selectedAddress`: string (address ID)
2. `selectedPayment`: string (payment method ID)
3. `promoCode`: string (input value)
4. `appliedPromoCode`: string | null (active promo code)
5. `promoError`: string | null (error message)
6. `loading`: boolean (order placement in progress)

### React Query
- **Cart Data**: From loader (server-side)
- **Addresses**: From loader (server-side)
- **Checkout Mutation**: Client-side mutation with cache invalidation

### Local Storage
- **Promo Code**: `localStorage.getItem("motogt_applied_promo_code")`
- **Persistence**: Survives page refreshes
- **Cleanup**: Removed after successful order placement

---

## 12. Post-Order Flow

### After Successful Order Placement

1. **Cache Invalidation**:
   - `["orders"]` query cache invalidated
   - `["cart"]` query cache invalidated
   - Ensures fresh data on next fetch

2. **Navigation**:
   - Redirects to `/profile/orders`
   - User sees their new order in the orders list

3. **Promo Code Cleanup**:
   - Removed from `localStorage`
   - Prevents reuse on next checkout

4. **Cart State**:
   - Backend clears cart after successful order
   - Cart page will show empty state

---

## 13. API Client Configuration

### Base URL Configuration
**File**: `app/lib/api-client.ts`

- **Server-Side (Loaders)**: Always uses full API URL (`https://api.motogt.com`)
- **Client-Side (Dev)**: Uses empty baseUrl, requests go to `/api/*` which Vite proxy forwards
- **Client-Side (Prod)**: Uses full API URL

### Request Interceptor
- Automatically adds `Authorization: Bearer {token}` header
- Token extracted from `accessTokenCookie`

### Response Interceptor
- Handles 401 errors
- Attempts token refresh
- Retries original request with new token

---

## 14. Key Design Decisions

### 1. Server-Side Data Loading
- Cart and addresses loaded in loader for faster initial render
- Reduces client-side API calls
- Better SEO and performance

### 2. Payment Method Workaround
- API enum limitations require storing actual method in `notes` field
- Frontend maps user-friendly IDs to API enum values
- Orders page reads from `notes` to display correct method

### 3. Promo Code Frontend Validation
- Quick validation for UX (immediate feedback)
- Backend still validates and calculates final discount
- Frontend calculation is for display only

### 4. Cart Read-Only on Checkout
- Cart modifications happen on cart page
- Checkout page only displays and places order
- Prevents accidental cart changes during checkout

### 5. Local Storage for Promo Codes
- Persists across page refreshes
- Better UX (user doesn't lose applied code)
- Cleaned up after order placement

---

## 15. Security Considerations

### Authentication
- All checkout endpoints require Bearer token
- Middleware enforces authentication before page access

### Backend Validation
- All financial calculations done on backend
- Frontend cannot override amounts
- Stock validation controlled by `validateStock` flag
- Address ownership validated by backend

### Data Integrity
- Cart items validated before order creation
- Promo codes validated on backend
- Payment methods validated against enum

---

## 16. Summary Flow Diagram

```
User clicks "Checkout"
    ↓
[Middleware] Check authentication
    ↓
[Loader] Fetch cart + addresses (parallel)
    ↓
[Component] Render checkout form
    ↓
User selects address + payment method
    ↓
User applies promo code (optional)
    ↓
User clicks "Place Order"
    ↓
[Validation] Check address + payment selected
    ↓
[API] POST /api/checkout with:
    - storeId
    - shippingAddressId
    - paymentMethod (mapped to enum)
    - notes (if CliQ/Card on Delivery)
    - promoCodes (if applied)
    ↓
[Backend] Validates + calculates amounts
    ↓
[Backend] Creates order + clears cart
    ↓
[Success] Invalidate cache + navigate to orders
    ↓
[Cleanup] Remove promo code from localStorage
```

---

## 17. Files Involved

1. **`app/routes/_main.checkout.tsx`**: Main checkout page component
2. **`app/lib/queries.ts`**: React Query mutation options
3. **`app/lib/api-client.ts`**: API client configuration
4. **`app/lib/client/sdk.gen.ts`**: Generated API client functions
5. **`app/lib/client/types.gen.ts`**: TypeScript types for API
6. **`app/lib/auth-middleware.ts`**: Authentication middleware
7. **`app/lib/cart-manager.tsx`**: Cart management utilities (not used in checkout, but related)

---

## 18. Future Improvements

1. **Payment Method Enum**: Add `"cliq"` and `"card_on_delivery"` to API enum to remove workaround
2. **Promo Code Backend**: Move promo code validation to backend API
3. **Shipping Methods**: Implement shipping method selection with cost calculation
4. **Billing Address**: Add separate billing address selection
5. **Order Confirmation**: Add order confirmation page before redirecting to orders
6. **Error Recovery**: Better error messages with retry mechanisms
7. **Stock Validation**: Show stock warnings before checkout
8. **Address Validation**: Real-time address validation

