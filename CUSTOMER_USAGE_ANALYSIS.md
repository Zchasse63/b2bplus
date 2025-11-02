# Customer Usage Data Analysis
**File:** BailyUsage.xlsx  
**Total Customers:** 32  
**Date:** November 2, 2025

---

## 📊 Summary

**Total Customers with Data:** 30  
**Customers with No Data:** 2 (D&S Dist, Biloxi Paper)

**Data Coverage:**
- **2023 Only:** 6 customers
- **2022 + 2023:** 23 customers
- **2024 Data:** 1 customer (D&S)
- **No Data:** 2 customers

**Total Data Rows:** ~3,700 product usage records

---

## 📋 Customer Breakdown

### ✅ Customers with 2022 + 2023 Data (23)
*These have growth columns (% Growth, Abs Growth) - we'll skip those*

1. **La Cosecha** - 99 products
2. **Lit** - 43 products
3. **La Tortilleria** - 113 products
4. **Modern** - 15 products
5. **MT** - 150 products
6. **Prosel** - 48 products
7. **Panchos** - 78 products
8. **Suncoast** - 49 products
9. **Specialty** - 94 products
10. **Top Line** - 181 products
11. **Tolteca** - 120 products
12. **Tumble GA** - 258 products
13. **Valencia** - 54 products
14. **A&L** - 29 products
15. **Atlantas Best** - 71 products
16. **Bravo Savannah** - 40 products
17. **Caravan** - 96 products
18. **Clems** - 23 products
19. **Chatt Paper** - 135 products
20. **DTM** - 20 products
21. **Frontera** - 462 products (has Category column)
22. **El Gran Progreso** - 567 products (has Invoice_Date, Month, Year)
23. **Jims** - 112 products (only has 2022, 2023 columns, no Item#)

---

### ✅ Customers with 2023 Only (6)

24. **Alamo** - 62 products
25. **KOS** - 156 products
26. **El Mirasol** - 15 products
27. **Bravos Jacksonville** - 461 products (unusual format)
28. **Santos** - 112 products (only Item Description column)
29. **Critchfield** - 64 products

---

### ✅ Customer with 2024 Data (1)

30. **D&S** (second tab with space) - 42 products, 2024 data + Monthly column

---

### ❌ Customers with No Data (2)

31. **D&S Dist** - Empty tab
32. **Biloxi Paper** - Empty tab

---

## 🔍 Data Format Variations

### Standard Format (Most Common)
```
Item# | Item Description | 2022 | 2023 | % Growth | Abs Growth
```
- 23 customers use this format
- We'll import Item#, Description, 2022, 2023
- Skip Growth columns

### 2023 Only Format
```
Item# | Item Description | 2023
```
- 6 customers use this format
- We'll import Item#, Description, 2023

### Special Cases

**Frontera:**
```
Item# | Item Description | Category | 2022 | 2023
```
- Has Category column (e.g., "FOC")

**El Gran Progreso:**
```
Invoice_Date | Month | Year | Item# | Item Description | Category | 2022 | 2023
```
- Has date/time information
- Most detailed format

**Jims:**
```
2022 | 2023
```
- No Item# or Description columns!
- Just usage numbers

**Bravos Jacksonville:**
```
703011.0 | DRY, ID-SC08COMBO 8 OZ HD PLASTIC CTR COMBO | DRY | 4.0
```
- Unusual format, first row appears to be data not headers

**Santos:**
```
Item Description
```
- Only has description, no Item# or usage numbers

**D&S (with space):**
```
Item# | Item Description | 2024 | Monthly
```
- Has 2024 data instead of 2022/2023
- Has Monthly average column

---

## 📦 Product Categories Identified

From the data samples, products include:
- **DRY** - Dry goods (plates, cups, cutlery, containers)
- **FRZ** - Frozen items (tilapia, chicken wings)
- **REF** - Refrigerated items (chicken)
- **FOC** - FOCO brand items (juices)

**Product Types:**
- Disposable plates (10", 12", 9")
- Plastic forks, knives, spoons
- Meal kits
- Food containers
- Cups (PET, foam)
- Gloves
- Paper towels
- Food items (rice, salt, tomatoes, fish, chicken)

---

## 💾 Import Strategy

### Phase 1: Create 32 Organizations
- Create all 32 distributor accounts
- Set type as "distributor"
- Use tab names as company names
- Auto-generate slugs

### Phase 2: Import Usage Data
- **30 customers with data** → Import
- **2 customers without data** → Skip (create account only)

### Phase 3: Handle Special Cases
- **Jims** - No Item# or Description, may need to skip or handle specially
- **Santos** - Only descriptions, no quantities
- **Bravos Jacksonville** - Parse unusual format
- **D&S** - Import 2024 data separately

### Data to Import Per Customer:
- Item# (SKU)
- Item Description
- 2022 Usage (if available)
- 2023 Usage (if available)
- 2024 Usage (if available)

**Skip:**
- % Growth columns
- Abs Growth columns
- Monthly averages
- Invoice dates (for now)

---

## 📊 Expected Results

**Organizations Created:** 32  
**Products Imported:** ~3,700 usage records  
**Years Covered:** 2022, 2023, 2024  

**Usage by Year:**
- **2022:** ~23 customers
- **2023:** ~29 customers
- **2024:** 1 customer

---

## ⚠️ Issues to Handle

1. **Jims** - No Item# or Description columns
2. **Santos** - Only descriptions, no usage numbers
3. **Bravos Jacksonville** - Unusual format
4. **D&S Dist** - Empty (create account only)
5. **Biloxi Paper** - Empty (create account only)
6. **D&S** (with space) - Different year (2024 instead of 2022/2023)

**Recommendation:** 
- Import what we can from 27 customers with standard formats
- Handle special cases manually or skip
- Create all 32 accounts regardless

---

## 🎯 Next Steps

1. ✅ Create 32 distributor organizations
2. ✅ Import usage data from 27 standard-format customers
3. ⚠️ Handle 3 special cases (Jims, Santos, Bravos Jacksonville)
4. ✅ Skip 2 empty customers (just create accounts)
5. ✅ Generate import report

**Ready to proceed?**
