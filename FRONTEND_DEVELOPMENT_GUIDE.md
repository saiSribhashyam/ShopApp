# Frontend Development Guide: Optical Shop API

## 1. Introduction

Welcome to the Optical Shop API! This guide is designed to help frontend developers understand and integrate with the backend services. The API allows for management of customers, prescriptions, product inventory, orders, and service/repair requests for an optical shop.

**Technology Stack:**
*   Backend: Node.js, Express.js
*   Database: MongoDB (via Mongoose)
*   Authentication: JWT (JSON Web Tokens)

## 2. Base URL

All API endpoints are prefixed with the following base URL:

*   **Development:** `http://localhost:5001/api`
    *   *Note: The port `5001` is the default and can be configured via the `.env` file in the backend project.*

## 3. Authentication

Most API endpoints are protected and require authentication using a JWT.

**3.1. Initial Shop Owner Setup**
*   **Endpoint:** `POST /auth/setup-owner`
*   **Description:** Registers the very first shop owner. This should typically be done once.
*   **Request Body:**
    ```json
    {
      "username": "yourchosenusername",
      "pin": "your4digitpin", // Min 4 characters
      "name": "Shop Owner Name"
    }
    ```
*   **Response:** Returns the owner's details and a JWT token. This token should be stored securely by the client for subsequent requests.
    *   *Security Note:* This endpoint should be disabled or heavily protected after initial setup in a production environment.

**3.2. Login**
*   **Endpoint:** `POST /auth/login`
*   **Description:** Authenticates an existing shop owner or staff member.
*   **Request Body:**
    ```json
    {
      "username": "existingusername",
      "pin": "theirpin"
    }
    ```
*   **Response:** If successful, returns user details (excluding PIN) and a JWT token.
    ```json
    {
      "_id": "owner_object_id",
      "username": "existingusername",
      "name": "Owner Name",
      "role": "owner", // or "staff"
      "token": "jwt.token.string"
    }
    ```

**3.3. Sending the Token**
For all protected endpoints, you must include the JWT token in the `Authorization` header with the `Bearer` scheme:
`Authorization: Bearer <your_jwt_token>`

**3.4. Checking Current Profile**
*   **Endpoint:** `GET /auth/profile`
*   **Description:** Retrieves the profile of the currently authenticated user (based on the token).
*   **Protected:** Yes.
*   **Response:** User details (excluding PIN).

## 4. Backend File Structure Overview (Simplified)

Understanding this can help visualize where API logic resides:
*   `config/`: Database connection settings.
*   `controllers/`: Contains the core logic for handling requests for each resource (e.g., `userController.js`, `productController.js`).
*   `middleware/`:
    *   `authMiddleware.js`: Handles token verification (`protect`) and role checks (`ownerOnly`).
    *   `errorMiddleware.js`: Handles `404 Not Found` and other general errors.
*   `models/`: Defines Mongoose schemas for data structures (e.g., `UserModel.js`, `ProductModel.js`).
*   `routes/`: Defines the API routes and maps them to controller functions (e.g., `userRoutes.js`, `productRoutes.js`).
*   `utils/`: Contains helper functions (e.g., `populationHelpers.js` for populating user details in prescriptions).
*   `server.js`: The main entry point that sets up the Express app, middleware, and routes.
*   `.env`: Stores environment variables like database URI, JWT secret, and port.

## 5. Key Data Models (API Perspective)

These are the primary data structures you'll interact with. Fields marked with `?` are optional.

*   **User (`UserModel`)**
    *   `_id`: String (MongoDB ObjectId)
    *   `name`: String (Required)
    *   `phno`: String (Required, Unique phone number)
    *   `age?`: Number
    *   `gender?`: String (Enum: 'Male', 'Female', 'Other', 'PreferNotToSay')
    *   `street?`, `city?`, `state?`, `zipCode?`: String
    *   `customerType?`: String (Enum: 'NewSpectacles', 'RepairOnly', 'ExistingPrescriptionPurchase', 'WalkIn')
    *   `createdAt`, `updatedAt`: Date

*   **ShopOwner (`ShopOwnerModel`)** (Mostly for context, frontend interacts via auth token)
    *   `_id`: String
    *   `username`: String
    *   `name`: String
    *   `role`: String ('owner', 'staff')

*   **Prescription (`PrescriptionModel`)**
    *   `_id`: String
    *   `userPhno`: String (Required, links to User's `phno`)
    *   `patientName`: String (Required, name snapshot)
    *   `patientAgeAtPrescription?`: Number (age snapshot)
    *   `nvLeftSph?`, `nvLeftCyl?`, `nvLeftAxis?`, ... (various optical parameters): Number
    *   `dvLeftSph?`, `dvLeftCyl?`, `dvLeftAxis?`, ...: Number
    *   `pupillaryDistance?`: Number
    *   `addPower?`: Number
    *   `optometristName?`: String
    *   `prescriptionDate`: Date (Required)
    *   `expiryDate?`: Date
    *   `notes?`: String
    *   `userDetails?`: Object (Populated by helper: contains name, phno, city, etc. of the linked user)
    *   `createdAt`, `updatedAt`: Date

*   **Product (`ProductModel`)**
    *   `_id`: String
    *   `productName`: String (Required)
    *   `productType`: String (Required, Enum: 'Frame', 'Lens', 'ContactLens', 'Accessory', 'Sunglasses')
    *   `brand?`: String
    *   `modelNumber?`: String
    *   `supplier?`: String
    *   `stockQuantity`: Number (Defaults to 0)
    *   `createdAt`, `updatedAt`: Date
    *   *(Note: `costPrice` and `sellingPrice` are NOT stored in the Product model).*

*   **Order (`OrderModel`)**
    *   `_id`: String
    *   `userId`: String (Ref to User `_id`, Required)
    *   `prescriptionId?`: String (Ref to Prescription `_id`)
    *   `orderItems`: Array of Objects (Required, at least one item)
        *   `productId`: String (Ref to Product `_id`, Required)
        *   `productNameSnapshot`: String (Required, denormalized)
        *   `productTypeSnapshot`: String (Required, denormalized)
        *   `quantity`: Number (Required, min 1)
        *   `unitPrice`: Number (Required, price per unit at time of sale)
        *   `totalPrice`: Number (Calculated: quantity * unitPrice)
    *   `billAmount`: Number (Calculated from orderItems, Required)
    *   `advancePaid?`: Number (Defaults to 0)
    *   `paymentStatus?`: String (Enum: 'Pending', 'Partial', 'Paid', 'Refunded', Default: 'Pending')
    *   `orderDate`: Date (Defaults to Date.now)
    *   `expectedDeliveryTimestamp?`: Date
    *   `actualDeliveryDate?`: Date
    *   `isDelivered?`: Boolean (Default: false)
    *   `orderStatus?`: String (Enum: 'PendingPayment', 'Processing', ..., Default: 'PendingPayment')
    *   `orderType`: String (Required, Enum: 'NewSpectaclesComplete', 'LensesOnly', ...)
    *   `notes?`: String
    *   `processedBy?`: String (Ref to ShopOwner `_id`)
    *   `createdAt`, `updatedAt`: Date
    *   `amountToBeCollected`: Number (Virtual field: billAmount - advancePaid)

*   **ServiceRepair (`ServiceRepairModel`)**
    *   `_id`: String
    *   `userId`: String (Ref to User `_id`, Required)
    *   `itemDescription`: String (Required)
    *   `issueDescription`: String (Required)
    *   `estimatedCost?`: Number
    *   `actualCost?`: Number
    *   `serviceStatus?`: String (Enum: 'Received', 'UnderRepair', ..., Default: 'Received')
    *   `dateReceived`: Date (Defaults to Date.now)
    *   `expectedCompletionDate?`: Date
    *   `actualCompletionDate?`: Date
    *   `notes?`: String
    *   `processedBy?`: String (Ref to ShopOwner `_id`)
    *   `createdAt`, `updatedAt`: Date

## 6. API Endpoints & Routes

All routes are prefixed by the Base URL (e.g., `http://localhost:5001/api`).
Most routes are protected and require the JWT token in the `Authorization` header.

---
**Authentication (`/auth`)**
---

*   **Setup Initial Owner**
    *   **Method**: `POST`
    *   **Path**: `/auth/setup-owner`
    *   **Protected**: No
    *   **Description**: Registers the first shop owner. Use with caution after initial setup.
    *   **Request Body**: See section 3.1.
    *   **Success Response (201)**: ShopOwner object with JWT token.

*   **Login Owner/Staff**
    *   **Method**: `POST`
    *   **Path**: `/auth/login`
    *   **Protected**: No
    *   **Description**: Authenticates a user and returns a JWT token.
    *   **Request Body**: See section 3.2.
    *   **Success Response (200)**: ShopOwner object with JWT token.

*   **Get Logged-in Profile**
    *   **Method**: `GET`
    *   **Path**: `/auth/profile`
    *   **Protected**: Yes
    *   **Description**: Retrieves the profile of the currently authenticated shop owner/staff.
    *   **Success Response (200)**: ShopOwner object (username, name, role, _id).

---
**Users (`/users`)**
---

*   **Create User**
    *   **Method**: `POST`
    *   **Path**: `/users`
    *   **Protected**: Yes
    *   **Description**: Creates a new customer record.
    *   **Request Body**:
        ```json
        {
          "name": "John Doe",
          "phno": "1234567890", // Unique
          "age": 30, // Optional
          "gender": "Male", // Optional
          "street": "123 Main St", // Optional
          "city": "Anytown", // Optional
          "state": "CA", // Optional
          "zipCode": "90210", // Optional
          "customerType": "WalkIn" // Optional
        }
        ```
    *   **Success Response (201)**: The created User object.

*   **Get All Users**
    *   **Method**: `GET`
    *   **Path**: `/users`
    *   **Protected**: Yes
    *   **Description**: Retrieves a list of users. Supports pagination and search.
    *   **Query Parameters**:
        *   `page?`: Number (e.g., `1`)
        *   `pageSize?`: Number (e.g., `10`)
        *   `phno?`: String (Search by part of a phone number)
    *   **Success Response (200)**:
        ```json
        {
          "users": [ /* array of User objects */ ],
          "page": 1,
          "pages": 5, // Total pages
          "count": 50 // Total users matching query
        }
        ```

*   **Get User Details by Phone (Global Search)**
    *   **Method**: `GET`
    *   **Path**: `/users/details-by-phone/:phno`
    *   **Protected**: Yes
    *   **Description**: Retrieves a comprehensive overview of a user including their details, prescriptions, orders, and service requests.
    *   **URL Parameter**: `:phno` - The phone number of the user.
    *   **Success Response (200)**:
        ```json
        {
          "userDetails": { /* User object */ },
          "prescriptions": [ /* array of Prescription objects, with populated userDetails */ ],
          "orders": [ /* array of Order objects, with populated details */ ],
          "serviceRepairs": [ /* array of ServiceRepair objects */ ]
        }
        ```

*   **Get User by ID**
    *   **Method**: `GET`
    *   **Path**: `/users/:id`
    *   **Protected**: Yes
    *   **Description**: Retrieves a single customer by their MongoDB ObjectId.
    *   **URL Parameter**: `:id` - The ObjectId of the user.
    *   **Success Response (200)**: The User object.

*   **Update User**
    *   **Method**: `PUT`
    *   **Path**: `/users/:id`
    *   **Protected**: Yes
    *   **Description**: Updates an existing customer's details.
    *   **URL Parameter**: `:id` - The ObjectId of the user.
    *   **Request Body**: Object containing fields to update (e.g., `{ "name": "Jane Doe", "age": 31 }`).
    *   **Success Response (200)**: The updated User object.

*   **Delete User**
    *   **Method**: `DELETE`
    *   **Path**: `/users/:id`
    *   **Protected**: Yes (`ownerOnly` middleware applied)
    *   **Description**: Deletes a customer. **Restricted to 'owner' role.**
    *   **URL Parameter**: `:id` - The ObjectId of the user.
    *   **Success Response (200)**: `{ "message": "Customer removed" }`.

---
**Prescriptions (`/prescriptions`)**
---

*   **Create Prescription**
    *   **Method**: `POST`
    *   **Path**: `/prescriptions`
    *   **Protected**: Yes
    *   **Description**: Creates a new prescription, linked to a user by their phone number.
    *   **Request Body**:
        ```json
        {
          "userPhno": "1234567890", // Required: Phone number of an existing user
          "patientName": "John Doe (Snapshot)", // Required: Name for the prescription
          "patientAgeAtPrescription": 30, // Optional: Age at time of prescription
          "prescriptionDate": "2023-10-26", // Required
          "dvLeftSph": -1.5, // Optional: Example vision parameter
          // ... other vision parameters ...
          "notes": "Progressive lenses recommended." // Optional
        }
        ```
    *   **Success Response (201)**: The created Prescription object, with `userDetails` populated.

*   **Get All Prescriptions**
    *   **Method**: `GET`
    *   **Path**: `/prescriptions`
    *   **Protected**: Yes
    *   **Description**: Retrieves a list of prescriptions.
    *   **Query Parameters**:
        *   `userPhno?`: String (Filter by the linked user's phone number)
    *   **Success Response (200)**: Array of Prescription objects, each with `userDetails` populated.

*   **Get Prescription by ID**
    *   **Method**: `GET`
    *   **Path**: `/prescriptions/:id`
    *   **Protected**: Yes
    *   **Description**: Retrieves a single prescription by its MongoDB ObjectId.
    *   **URL Parameter**: `:id` - The ObjectId of the prescription.
    *   **Success Response (200)**: The Prescription object, with `userDetails` populated.

*   **Update Prescription**
    *   **Method**: `PUT`
    *   **Path**: `/prescriptions/:id`
    *   **Protected**: Yes
    *   **Description**: Updates an existing prescription.
    *   **URL Parameter**: `:id` - The ObjectId of the prescription.
    *   **Request Body**: Object containing fields to update (e.g., `{ "notes": "Updated notes.", "userPhno": "0987654321" }`).
    *   **Success Response (200)**: The updated Prescription object, with `userDetails` populated.

*   **Delete Prescription**
    *   **Method**: `DELETE`
    *   **Path**: `/prescriptions/:id`
    *   **Protected**: Yes (`ownerOnly` middleware applied)
    *   **Description**: Deletes a prescription. **Restricted to 'owner' role.**
    *   **URL Parameter**: `:id` - The ObjectId of the prescription.
    *   **Success Response (200)**: `{ "message": "Prescription removed" }`.

---
**Products (`/products`)**
---

*   **Create Product**
    *   **Method**: `POST`
    *   **Path**: `/products`
    *   **Protected**: Yes
    *   **Description**: Adds a new product to the inventory. Prices are not set here.
    *   **Request Body**:
        ```json
        {
          "productName": "Deluxe Frame Model X",
          "productType": "Frame", // Required: 'Frame', 'Lens', 'ContactLens', 'Accessory', 'Sunglasses'
          "brand": "OptiBrand", // Optional
          "modelNumber": "DXM-001", // Optional
          "supplier": "Frame Suppliers Inc.", // Optional
          "stockQuantity": 50 // Optional, defaults to 0
        }
        ```
    *   **Success Response (201)**: The created Product object.

*   **Get All Products**
    *   **Method**: `GET`
    *   **Path**: `/products`
    *   **Protected**: Yes
    *   **Description**: Retrieves a list of products. Supports pagination, search, and filtering.
    *   **Query Parameters**:
        *   `page?`: Number
        *   `pageSize?`: Number
        *   `keyword?`: String (Searches productName, brand, modelNumber, productType)
        *   `productType?`: String (Filter by specific product type)
    *   **Success Response (200)**: Object containing `products` array and pagination details.

*   **Get Product by ID**
    *   **Method**: `GET`
    *   **Path**: `/products/:id`
    *   **Protected**: Yes
    *   **Description**: Retrieves a single product by its MongoDB ObjectId.
    *   **URL Parameter**: `:id` - The ObjectId of the product.
    *   **Success Response (200)**: The Product object.

*   **Update Product**
    *   **Method**: `PUT`
    *   **Path**: `/products/:id`
    *   **Protected**: Yes
    *   **Description**: Updates an existing product's details (excluding prices).
    *   **URL Parameter**: `:id` - The ObjectId of the product.
    *   **Request Body**: Object containing fields to update.
    *   **Success Response (200)**: The updated Product object.

*   **Delete Product**
    *   **Method**: `DELETE`
    *   **Path**: `/products/:id`
    *   **Protected**: Yes (`ownerOnly` middleware applied)
    *   **Description**: Deletes a product. **Restricted to 'owner' role.**
    *   **URL Parameter**: `:id` - The ObjectId of the product.
    *   **Success Response (200)**: `{ "message": "Product removed" }`.

*   **Update Product Stock**
    *   **Method**: `PUT`
    *   **Path**: `/products/:id/stock`
    *   **Protected**: Yes
    *   **Description**: Manually adjusts the stock quantity of a product.
    *   **URL Parameter**: `:id` - The ObjectId of the product.
    *   **Request Body**:
        ```json
        {
          "quantityChange": 10, // Can be positive or negative for relative adjustment
          "type": "relative" // or "absolute" to set a new total
        }
        ```
    *   **Success Response (200)**: The updated Product object.

---
**Orders (`/orders`)**
---

*   **Create Order**
    *   **Method**: `POST`
    *   **Path**: `/orders`
    *   **Protected**: Yes
    *   **Description**: Creates a new customer order.
    *   **Request Body**:
        ```json
        {
          "userId": "user_object_id", // Required
          "prescriptionId": "prescription_object_id", // Optional
          "orderItems": [ // Required, at least one item
            {
              "productId": "product_object_id", // Required
              "quantity": 1, // Required
              "unitPrice": 150.00 // Required: Price for this item in this order
            }
            // ... more items
          ],
          "orderType": "NewSpectaclesComplete", // Required
          "advancePaid": 50.00, // Optional
          "paymentStatus": "Partial", // Optional
          "expectedDeliveryTimestamp": "2023-11-15T10:00:00.000Z", // Optional
          "notes": "Customer requested a call upon arrival." // Optional
        }
        ```
    *   **Success Response (201)**: The created Order object, with nested `prescriptionId` (if any) also having its `userDetails` populated.

*   **Get All Orders**
    *   **Method**: `GET`
    *   **Path**: `/orders`
    *   **Protected**: Yes
    *   **Description**: Retrieves a list of orders.
    *   **Query Parameters**:
        *   `page?`, `pageSize?`: Numbers for pagination.
        *   `userId?`: String (Filter by User ObjectId).
        *   `paymentStatus?`: String.
        *   `orderStatus?`: String.
        *   `isDelivered?`: Boolean (`true` or `false`).
    *   **Success Response (200)**: Object with `orders` array (each order having populated `userId`, `prescriptionId` (with `userDetails`), `processedBy`, `orderItems.productId`) and pagination details.

*   **Get Order by ID**
    *   **Method**: `GET`
    *   **Path**: `/orders/:id`
    *   **Protected**: Yes
    *   **Description**: Retrieves a single order by its MongoDB ObjectId.
    *   **URL Parameter**: `:id` - The ObjectId of the order.
    *   **Success Response (200)**: The Order object with populated details similar to Get All Orders.

*   **Update Order**
    *   **Method**: `PUT`
    *   **Path**: `/orders/:id`
    *   **Protected**: Yes
    *   **Description**: Updates an order's status, payment, delivery info, etc. (Order items are not updated here; cancelling an order may restock items).
    *   **URL Parameter**: `:id` - The ObjectId of the order.
    *   **Request Body**:
        ```json
        {
          "orderStatus": "Processing",
          "paymentStatus": "Paid",
          "advancePaid": 275.00, // If updating total advance
          "isDelivered": false,
          // ... other updatable fields from the model
        }
        ```
    *   **Success Response (200)**: The updated Order object, with populated details.

*   **Delete Order**
    *   **Method**: `DELETE`
    *   **Path**: `/orders/:id`
    *   **Protected**: Yes (`ownerOnly` middleware recommended)
    *   **Description**: Deletes an order. Use with caution; cancelling is often preferred.
    *   **URL Parameter**: `:id` - The ObjectId of the order.
    *   **Success Response (200)**: `{ "message": "Order removed" }`.

---
**Service & Repairs (`/services`)**
---

*   **Create Service/Repair Request**
    *   **Method**: `POST`
    *   **Path**: `/services`
    *   **Protected**: Yes
    *   **Description**: Creates a new service or repair request for a user.
    *   **Request Body**:
        ```json
        {
          "userId": "user_object_id", // Required
          "itemDescription": "BrandX Sunglasses", // Required
          "issueDescription": "Right lens scratched, hinge loose.", // Required
          "estimatedCost": 30.00, // Optional
          "serviceStatus": "Received", // Optional
          "expectedCompletionDate": "2023-11-05" // Optional
        }
        ```
    *   **Success Response (201)**: The created ServiceRepair object.

*   **Get All Service/Repair Requests**
    *   **Method**: `GET`
    *   **Path**: `/services`
    *   **Protected**: Yes
    *   **Description**: Retrieves a list of service/repair requests.
    *   **Query Parameters**:
        *   `page?`, `pageSize?`: Numbers for pagination.
        *   `userId?`: String (Filter by User ObjectId).
        *   `serviceStatus?`: String.
    *   **Success Response (200)**: Object with `serviceRepairs` array (each with populated `userId` and `processedBy`) and pagination details.

*   **Get Service/Repair Request by ID**
    *   **Method**: `GET`
    *   **Path**: `/services/:id`
    *   **Protected**: Yes
    *   **Description**: Retrieves a single service/repair request.
    *   **URL Parameter**: `:id` - The ObjectId of the request.
    *   **Success Response (200)**: The ServiceRepair object with populated details.

*   **Update Service/Repair Request**
    *   **Method**: `PUT`
    *   **Path**: `/services/:id`
    *   **Protected**: Yes
    *   **Description**: Updates an existing service/repair request.
    *   **URL Parameter**: `:id` - The ObjectId of the request.
    *   **Request Body**: Object with fields to update (e.g., `{ "serviceStatus": "RepairComplete", "actualCost": 25.00 }`).
    *   **Success Response (200)**: The updated ServiceRepair object.

*   **Delete Service/Repair Request**
    *   **Method**: `DELETE`
    *   **Path**: `/services/:id`
    *   **Protected**: Yes (`ownerOnly` middleware recommended)
    *   **Description**: Deletes a service/repair request.
    *   **URL Parameter**: `:id` - The ObjectId of the request.
    *   **Success Response (200)**: `{ "message": "Service/Repair request removed" }`.


## 7. Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request.

*   **Common Success Codes**:
    *   `200 OK`: Request was successful (for GET, PUT).
    *   `201 Created`: Resource was successfully created (for POST).
*   **Common Error Codes**:
    *   `400 Bad Request`: The request was malformed, e.g., missing required fields, validation errors. The response body often contains a `message` and an `errors` object detailing the issues.
        ```json
        {
          "message": "Validation error message",
          "errors": { "fieldName": { "message": "Specific field error" } }
        }
        ```
    *   `401 Unauthorized`: Authentication failed. The JWT token is missing, invalid, or expired.
        ```json
        { "message": "Not authorized, token failed" }
        ```
    *   `403 Forbidden`: The authenticated user does not have permission to perform the requested action (e.g., a 'staff' user trying an 'ownerOnly' action).
        ```json
        { "message": "Not authorized, owner role required" }
        ```
    *   `404 Not Found`: The requested resource or endpoint could not be found.
        ```json
        { "message": "Not Found - /api/nonexistentroute" }
        ```
    *   `500 Internal Server Error`: An unexpected error occurred on the server.
        ```json
        { "message": "Server error message" }
        ```
    *   The error response generally includes a `message` field. In development mode (`NODE_ENV=development`), it may also include a `stack` trace.

## 8. Basic Workflow Example: New Customer Order for Spectacles

1.  **Shop Staff Logs In**:
    *   Frontend: Sends `POST /api/auth/login` with `username` and `pin`.
    *   Backend: Responds with staff details and `token`.
    *   Frontend: Stores the `token`.

2.  **New Customer Arrives - Create Customer Record**:
    *   Frontend: Sends `POST /api/users` (with token) with customer details (name, phno, etc.).
    *   Backend: Creates user, responds with `newUser` object (including `newUser._id` and `newUser.phno`).

3.  **Eye Test Done - Create Prescription**:
    *   Frontend: Sends `POST /api/prescriptions` (with token).
        *   Body includes `userPhno: newUser.phno`, `patientName: newUser.name` (or as entered), `patientAgeAtPrescription: newUser.age` (or as entered), and optical details.
    *   Backend: Creates prescription, responds with `newPrescription` object (including `newPrescription._id`).

4.  **Customer Selects Frame and Lenses - Prepare Order**:
    *   Frontend: Staff searches for products. `GET /api/products?productType=Frame&keyword=BrandX` (with token) -> get `frameProductId`.
    *   Frontend: `GET /api/products?productType=Lens&keyword=Progressive` (with token) -> get `lensProductId`.

5.  **Create Order**:
    *   Frontend: Sends `POST /api/orders` (with token).
        *   Body:
            ```json
            {
              "userId": "newUser._id",
              "prescriptionId": "newPrescription._id",
              "orderItems": [
                { "productId": "frameProductId", "quantity": 1, "unitPrice": 120.00 },
                { "productId": "lensProductId", "quantity": 2, "unitPrice": 80.00 } // For a pair
              ],
              "orderType": "NewSpectaclesComplete",
              "advancePaid": 50.00
            }
            ```
    *   Backend: Creates order, reduces stock for frame and lenses, responds with `newOrder` object.

6.  **Customer Later Inquires (Global Search)**:
    *   Frontend: Staff searches by phone `GET /api/users/details-by-phone/newUser.phno` (with token).
    *   Backend: Responds with all details for that customer.

## 9. Tips for Frontend Development

*   **CORS (Cross-Origin Resource Sharing)**: The backend currently uses `app.use(cors())` which allows requests from any origin. For production, this should be configured to allow requests only from the specific frontend domain(s).
*   **HTTP Headers**:
    *   For requests with a JSON body (POST, PUT), set `Content-Type: application/json`.
    *   For protected routes, set `Authorization: Bearer <your_jwt_token>`.
*   **Asynchronous Operations**: All API calls are asynchronous. Use `async/await` or Promises in your JavaScript code to handle them.
*   **User Feedback**: Implement clear loading states, success messages, and error notifications for the user based on API responses.
*   **Token Management**:
    *   Securely store the JWT token (e.g., in `localStorage` or `sessionStorage`, though be mindful of XSS if using `localStorage`). HttpOnly cookies are a more secure option if the backend supports them for token transfer (not implemented here).
    *   The current JWTs expire in `30d`. Your application should ideally handle token expiration, perhaps by redirecting to login if a `401 Unauthorized` response is received due to an expired token. A more advanced setup would involve token refresh mechanisms, which are not part of this API's current feature set.
*   **Data Validation**: While the backend performs validation, frontend validation can improve user experience by catching errors before API calls are made.

This guide should provide a solid foundation for developing a frontend application that interacts with the Optical Shop API.
