# Application Summary: Optical Shop API

## 1. Overview

This Node.js application, built with Express.js and Mongoose, serves as the backend API for an Optical Shop management system. It allows shop owners and staff to manage customers, prescriptions, product inventory, orders, and service/repair requests. Authentication is handled via JWT, with role-based access control for certain operations.

## 2. Core Features

*   **Authentication & Authorization**:
    *   Shop owner/staff registration (initial setup) and PIN-based login.
    *   JWT generation for session management.
    *   Protected routes requiring authentication.
    *   Role-based access (e.g., 'owner' role for sensitive operations like deleting users).
*   **User (Customer) Management**:
    *   Create, Read, Update, Delete (CRUD) operations for customers.
    *   Store customer details like name, phone number, address, age, gender, and customer type.
    *   Search customers by phone number.
    *   Pagination for listing customers.
*   **Prescription Management**:
    *   CRUD operations for optical prescriptions.
    *   Link prescriptions to users or store them for walk-in patients.
    *   Store detailed prescription parameters (NV, DV, PD, Add Power, etc.).
    *   Filter prescriptions by user.
*   **Product Inventory Management**:
    *   CRUD operations for products (frames, lenses, contact lenses, accessories, sunglasses).
    *   Store product details: name, type, brand, model, supplier, cost price, selling price, stock quantity.
    *   Search and filter products (by keyword, type).
    *   Pagination for listing products.
    *   Manual stock adjustment endpoint.
*   **Order Management**:
    *   CRUD operations for customer orders.
    *   Link orders to users and (optionally) prescriptions.
    *   Manage multiple items per order ( `orderItems` sub-document).
    *   Store product details snapshots (name, type, price) at the time of order.
    *   Automatic bill amount calculation from order items.
    *   Track advance payment, payment status, order status, delivery details.
    *   Automatic stock quantity reduction when an order is placed.
    *   Automatic stock quantity increase if an order is cancelled (via update).
    *   Populate related data (user, prescription, product details) when fetching orders.
*   **Service & Repair Management**:
    *   CRUD operations for service and repair requests.
    *   Link requests to users.
    *   Track item description, issue, estimated/actual costs, service status, and relevant dates.
    *   Log which shop staff member processed/updated the request.

## 3. Data Models

*   **`ShopOwnerModel`**: Stores shop owner/staff credentials (username, hashed PIN, name, role).
*   **`UserModel`**: Stores customer information.
*   **`PrescriptionModel`**: Stores optical prescription details. It is **mandatorily linked to a `User` via their phone number (`userPhno`)**. Includes `patientName` (as a name snapshot) and `patientAgeAtPrescription` (age at the time of prescription).
*   **`ProductModel`**: Stores details of products available in the shop.
*   **`OrderModel`**: Stores customer order information, embedding `OrderItemSchema` for items within an order. Includes references to `User`, `Prescription`, and `ShopOwner` (for `processedBy`).
    *   **`OrderItemSchema`** (sub-document): Details of each product in an order (productId, quantity, unitPrice, totalPrice, snapshots).
*   **`ServiceRepairModel`**: Stores information about service and repair requests, linked to `User` and `ShopOwner` (for `processedBy`).

## 4. API Endpoints

All routes are prefixed with `/api`. Authentication (`protect`) is applied to most routes, with `ownerOnly` for specific destructive actions.

### 4.1. Authentication (`/auth`)

*   **`POST /setup-owner`**: Register the initial shop owner. (Public, ideally restricted after first use).
    *   Body: `{ username, pin, name, role? }`
*   **`POST /login`**: Login for shop owner/staff. (Public).
    *   Body: `{ username, pin }`
*   **`GET /profile`**: Get the profile of the currently logged-in shop owner/staff. (Protected).

### 4.2. Users (`/users`)

*   **`POST /`**: Create a new customer. (Protected).
    *   Body: `{ name, phno, age?, gender?, street?, city?, state?, zipCode?, customerType? }`
*   **`GET /`**: Get all customers. Supports pagination (`?page=1&pageSize=10`) and search (`?phno=...`). (Protected).
*   **`GET /details-by-phone/:phno`**: Get comprehensive user details by phone number. (Protected).
    *   Retrieves user's personal details.
    *   Retrieves all prescriptions linked to the user's phone number (includes populated user details within each prescription for consistency).
    *   Retrieves all orders placed by the user (identified by their `_id`, includes populated prescription and product details).
    *   Retrieves all service/repair requests for the user.
    *   Response structure:
        ```json
        {
          "userDetails": { ...user fields... },
          "prescriptions": [ ...list of prescriptions... ],
          "orders": [ ...list of orders... ],
          "serviceRepairs": [ ...list of service/repairs... ]
        }
        ```
*   **`GET /:id`**: Get a single customer by ID. (Protected).
*   **`PUT /:id`**: Update a customer. (Protected).
    *   Body: (Fields to update)
*   **`DELETE /:id`**: Delete a customer. (Protected, OwnerOnly).

### 4.3. Prescriptions (`/prescriptions`)

*   **`POST /`**: Create a new prescription. (Protected).
    *   Body: `{ userPhno, patientName, patientAgeAtPrescription?, prescriptionDate, nvLeftSph?, ..., notes? }`
*   **`GET /`**: Get all prescriptions. Supports filtering by user's phone number (`?userPhno=...`). (Protected).
*   **`GET /:id`**: Get a single prescription by ID. (Protected).
*   **`PUT /:id`**: Update a prescription. (Protected).
    *   Body: (Fields to update)
*   **`DELETE /:id`**: Delete a prescription. (Protected, OwnerOnly).

### 4.4. Products (`/products`)

*   **`POST /`**: Create a new product. (Protected).
    *   Body: `{ productName, productType, brand?, modelNumber?, supplier?, stockQuantity? }`
*   **`GET /`**: Get all products. Supports pagination (`?page=1&pageSize=10`), search (`?keyword=...`), and filtering (`?productType=...`). (Protected).
*   **`GET /:id`**: Get a single product by ID. (Protected).
*   **`PUT /:id`**: Update a product. (Protected).
    *   Body: `{ productName?, productType?, brand?, modelNumber?, supplier?, stockQuantity? }` <!-- Explicitly listing fields without price -->
*   **`DELETE /:id`**: Delete a product. (Protected, OwnerOnly).
*   **`PUT /:id/stock`**: Manually update stock quantity for a product. (Protected).
    *   Body: `{ quantityChange, type ('absolute' | 'relative') }`

### 4.5. Orders (`/orders`)

*   **`POST /`**: Create a new order. (Protected).
    *   Body: `{ userId, orderItems: [{ productId, quantity, unitPrice }], orderType, advancePaid?, paymentStatus?, expectedDeliveryTimestamp?, notes?, prescriptionId? }` <!-- unitPrice is now mandatory -->
*   **`GET /`**: Get all orders. Supports pagination (`?page=1&pageSize=10`) and filtering (`?userId=...`, `?paymentStatus=...`, `?orderStatus=...`, `?isDelivered=...`). (Protected).
*   **`GET /:id`**: Get a single order by ID. (Protected).
*   **`PUT /:id`**: Update an order (status, payment, delivery details, etc.). (Protected).
    *   Body: `{ advancePaid?, paymentStatus?, orderStatus?, isDelivered?, actualDeliveryDate?, notes? }` (Note: Order items are not updated here; cancelling an order via status update can restock items).
*   **`DELETE /:id`**: Delete an order. (Protected, OwnerOnly - Use with caution; cancelling is preferred).

### 4.6. Service & Repairs (`/services`)

*   **`POST /`**: Create a new service/repair request. (Protected).
    *   Body: `{ userId, itemDescription, issueDescription, estimatedCost?, serviceStatus?, dateReceived?, expectedCompletionDate?, notes? }`
*   **`GET /`**: Get all service/repair requests. Supports pagination (`?page=1&pageSize=10`) and filtering (`?userId=...`, `?serviceStatus=...`). (Protected).
*   **`GET /:id`**: Get a single service/repair request by ID. (Protected).
*   **`PUT /:id`**: Update a service/repair request. (Protected).
    *   Body: (Fields to update, e.g., `actualCost`, `serviceStatus`, `notes`)
*   **`DELETE /:id`**: Delete a service/repair request. (Protected, OwnerOnly).

### 4.7. Analytics API (`/analytics`)

Provides endpoints for data aggregation and analytics. All routes are protected.

*   **`GET /sales-summary`**: Retrieves sales Key Performance Indicators (KPIs) such as total revenue, average order value, total orders, and total items sold. Supports `startDate` and `endDate` query parameters for filtering.
*   **`GET /sales-over-time`**: Retrieves sales trend data (revenue and order count) grouped by specified periods (daily, weekly, monthly). Supports `startDate`, `endDate`, and `period` query parameters.

## 5. Middleware

*   **`authMiddleware.js`**:
    *   `protect`: Verifies JWT and attaches `req.shopOwner` if valid.
    *   `ownerOnly`: Restricts access to users with the 'owner' role.
*   **`errorMiddleware.js`**:
    *   `notFound`: Handles requests to non-existent routes (404).
    *   `errorHandler`: Generic error handler, sends JSON response with error details.

## 6. Environment Configuration (`.env`)

*   `PORT`: Port for the server to run on (default 5001).
*   `MONGO_URI`: MongoDB connection string.
*   `JWT_SECRET`: Secret key for signing JWTs (placeholder, **MUST be changed for production**).
*   `NODE_ENV`: Application environment (`development` or `production`).

## 7. Potential Frontend Pages/Views

Based on the API functionality, a frontend application would likely require the following pages/sections:

*   **Authentication**:
    *   Login Page (for existing staff/owner)
    *   Initial Setup Page (for the very first owner registration, could be a separate CLI command or a temporary route in a real app)
    *   Profile Page (to view logged-in user details)
*   **Dashboard/Home**:
    *   Overview of key metrics (e.g., recent orders, pending services).
*   **Customers**:
    *   Customer List Page (with search, pagination).
    *   Add/Edit Customer Form/Modal.
    *   Customer Detail View (showing their info, linked prescriptions, orders).
*   **Prescriptions**:
    *   Prescription List Page (filterable by customer).
    *   Add/Edit Prescription Form/Modal.
    *   Prescription Detail View.
*   **Products/Inventory**:
    *   Product List Page (with search, filters for type/brand, pagination).
    *   Add/Edit Product Form/Modal (including stock quantity).
    *   Product Detail View.
    *   Stock Adjustment Interface.
*   **Orders**:
    *   Order List Page (with filters for status, customer, date ranges, pagination).
    *   Create New Order Page/Wizard:
        *   Select Customer.
        *   Select/Enter Prescription (if applicable).
        *   Add Products to Order (search/select from inventory, specify quantity).
        *   Enter payment details (advance, type).
        *   Set expected delivery.
    *   Order Detail View (showing all items, payment status, order history/status changes).
    *   Update Order Status/Payment/Delivery Form/Modal.
*   **Services & Repairs**:
    *   Service/Repair List Page (with filters for status, customer).
    *   Create New Service/Repair Request Form/Modal.
    *   Service/Repair Detail View.
    *   Update Service/Repair Status/Cost Form/Modal.
*   **Staff Management (Owner Only)**:
    *   If multiple staff roles are implemented beyond the initial `ShopOwnerModel` scope (e.g. creating 'staff' accounts by an 'owner').
    *   List Staff Page.
    *   Add/Edit Staff Form.

This structure provides a comprehensive starting point for building a user interface for the Optical Shop API.
