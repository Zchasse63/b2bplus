
# B2B+ Platform: Comprehensive Testing Protocol

**Date**: October 31, 2025
**Version**: 1.0
**Author**: Manus AI

---

## 1. Introduction

This document outlines the comprehensive testing protocol for the B2B+ web platform. The purpose of this protocol is to ensure all features are working as expected, identify any bugs or issues, and verify the platform is stable and production-ready before moving to Priority 2 development.

### 1.1. Testing Environment

- **URL**: [https://3000-ic6it7bybpyek4pm6h2dt-89671d04.manusvm.computer](https://3000-ic6it7bybpyek4pm6h2dt-89671d04.manusvm.computer)
- **Browser**: Latest version of Chrome is recommended.
- **Data**: The database has been seeded with sample data, but testers are encouraged to create new accounts and data.

### 1.2. Testing Roles

- **Tester**: Manus AI
- **Stakeholder**: User

### 1.3. Bug Reporting

Any bugs or issues found during testing should be documented with the following information:

- **Feature**: The feature where the bug occurred.
- **Test Case ID**: The specific test case that failed.
- **Description**: A clear and concise description of the bug.
- **Steps to Reproduce**: Step-by-step instructions to reproduce the bug.
- **Expected Result**: What should have happened.
- **Actual Result**: What actually happened.
- **Severity**: Critical, High, Medium, Low.

---

## 2. Test Cases

### 2.1. User Authentication

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Sign Up | Verify a new user can create an account. | 1. Navigate to the Sign Up page. <br> 2. Fill in all required fields with valid data. <br> 3. Click "Create Account". | User is redirected to the home page and is logged in. A new user record is created in the database. | | | 
| **AUTH-02** | Sign Up | Verify error handling for existing email. | 1. Attempt to sign up with an email that already exists. | An error message "User already registered" is displayed. | | | 
| **AUTH-03** | Login | Verify a registered user can log in. | 1. Navigate to the Login page. <br> 2. Enter valid credentials. <br> 3. Click "Sign In". | User is redirected to the home page and is logged in. | | | 
| **AUTH-04** | Login | Verify error handling for invalid credentials. | 1. Attempt to log in with an incorrect password. | An error message "Invalid login credentials" is displayed. | | | 
| **AUTH-05** | Logout | Verify a logged-in user can log out. | 1. Click the user profile icon in the header. <br> 2. Click "Sign Out". | User is redirected to the login page. | | | 

### 2.2. Products & Catalog

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PROD-01** | View Products | Verify products are displayed correctly on the products page. | 1. Navigate to the Products page. | A grid of products is displayed with images, names, and prices. | | |
| **PROD-02** | Search Products | Verify product search functionality. | 1. On the Products page, use the search bar to search for a product by name or SKU. | The product list updates to show only matching products. | | |
| **PROD-03** | Filter Products | Verify product filtering by category. | 1. On the Products page, use the category filter to select a category. | The product list updates to show only products in the selected category. | | |
| **PROD-04** | View Product Details | Verify navigation to and display of the product detail page. | 1. Click on a product from the products list. | The product detail page is displayed with all product information. | | |
| **PROD-05** | Add to Cart | Verify adding a product to the cart from the product detail page. | 1. On a product detail page, select a quantity and click "Add to Cart". | A success toast notification is displayed, and the cart icon in the header updates with the new count. | | |

### 2.3. Shopping Cart

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CART-01** | View Cart | Verify the cart page displays correct items and totals. | 1. Navigate to the Cart page. | All items added to the cart are displayed with correct quantities, prices, and a correct subtotal. | | |
| **CART-02** | Update Quantity | Verify quantity can be updated in the cart. | 1. On the Cart page, change the quantity of an item. | The line item total and the cart subtotal update correctly. | | |
| **CART-03** | Remove from Cart | Verify an item can be removed from the cart. | 1. On the Cart page, click the remove button for an item. | The item is removed from the cart, and the subtotal is updated. | | |
| **CART-04** | Proceed to Checkout | Verify the "Proceed to Checkout" button navigates to the checkout page. | 1. On the Cart page, click "Proceed to Checkout". | The user is navigated to the checkout page. | | |

### 2.4. Checkout & Orders

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CHECK-01** | Place Order | Verify a user can successfully place an order. | 1. From the checkout page, fill in all required shipping information. <br> 2. Click "Place Order". | The order is successfully placed, the cart is cleared, and the user is redirected to the order confirmation page (or order history). | | |
| **ORDER-01** | View Order History | Verify the order history page displays all placed orders. | 1. Navigate to the Orders page. | A list of all past orders is displayed with order number, date, status, and total. | | |
| **ORDER-02** | View Order Details | Verify the order details page displays correct information. | 1. From the order history page, click on an order to view its details. | The order details page is displayed with all order information, including items, shipping address, and totals. | | |
| **ORDER-03** | Quick Reorder | Verify the Quick Reorder functionality from the order history page. | 1. On the order history page, click the "Reorder" button for an order. | The items from that order are added to the cart, and the user is redirected to the cart. | | |

### 2.5. Invoices

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **INV-01** | View Invoices | Verify the invoices page displays a list of invoices. | 1. Navigate to the Invoices page. | A list of invoices is displayed with invoice number, order number, date, status, and total. | | |
| **INV-02** | View Invoice Details | Verify the invoice details page displays correct information. | 1. From the invoices page, click on an invoice to view its details. | The invoice details page is displayed with all invoice information. | | |
| **INV-03** | Mark as Paid | Verify an unpaid invoice can be marked as paid. | 1. On an unpaid invoice details page, click "Mark as Paid". | The invoice status updates to "Paid". | | |

### 2.6. Container Calculator

| Test Case ID | Feature | Test Description | Steps to Reproduce | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CALC-01** | Calculate Load | Verify the container calculator provides a valid result. | 1. Navigate to the Container Calculator page. <br> 2. Select a container type and a product. <br> 3. Click "Calculate". | A valid calculation result is displayed with units, utilization, and a recommendation. | | |
| **CALC-02** | Handle Invalid Product | Verify the calculator handles products without dimensions. | 1. Select a product that does not have dimensions specified. | The product should not be selectable, or an error message should be displayed. | | |

---

## 3. Testing Schedule

- **Start Date**: October 31, 2025
- **End Date**: November 1, 2025

## 4. Sign-off

Once all test cases have been executed and any critical or high-severity bugs have been resolved, the testing phase will be considered complete.
