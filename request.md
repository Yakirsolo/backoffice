You are a senior UI/UX designer and full-stack engineer.

We are building a Hebrew RTL back office system for a nutrition coaching business.

The system is used by nutrition coaches to manage customers who are going through a fat-loss process.

Your goal:
Create a simple, modern, intuitive back office that feels like a premium SaaS product.
The main principle: a customer is not just a database record, but a journey/process.

Important:
- The entire UI must be in Hebrew.
- The layout must support RTL properly.
- The UX should be optimized for daily usage by a nutrition coach.
- Avoid complex enterprise CRM feeling.
- Prioritize speed and simplicity.

## Main Navigation

Create the following sections:

1. Dashboard
2. Customers (לקוחות)
3. Calendar (יומן)
4. Payments (תשלומים)
5. Analytics (אנליטיקה)
6. Settings (הגדרות)

---

# Dashboard

The dashboard should show daily operational information:

Cards:

- פגישות היום
- לקוחות חדשים
- תשלומים קרובים
- לקוחות שדורשים מעקב

Show upcoming meetings:

Example:

10:00
שרה כהן
שיחת זום

12:30
דנה לוי
מעקב שבועי

Show payment reminders:

- תשלום מחר
- תשלום באיחור

Keep it clean, no unnecessary charts.

---

# Customers Page

Main screen for customer management.

Features:

- Search customers
- Filter by status:
  - פעיל
  - הסתיים
  - מושהה
  - ניסיון

Customer cards/table should show:

- שם
- תמונה
- משקל נוכחי
- ירידה במשקל
- מסלול
- תאריך התחלה
- סטטוס


---

# Customer Profile

This is the most important screen.

Create tabs:

## 1. סקירה

Contains static information:

Personal details:

- שם
- גיל
- תיאור קצר
- טלפון
- Instagram
- Facebook

Business information:

- מקור הגעה:
  - Instagram
  - Facebook
  - המלצה
  - אתר
  - אחר

Program:

- איזה מסלול
- תאריך תחילת תהליך
- משקל התחלתי
- משקל יעד

---

## 2. התקדמות

This is a timeline-based system.

DO NOT create fixed columns:
"שבוע ראשון / שבוע שני / שבוע שלישי"

Instead create measurement events.

Each progress update contains:

Date:

Weight:
- משקל

Measurements:
- היקף בטן
- היקף ירך
- היקף ישבן

Photos:

- תמונה לפני
- תמונות לאורך התהליך

Example:

05/01/2026

משקל:
82 ק"ג

היקף בטן:
98 ס"מ

היקף ירך:
110 ס"מ

Photos uploaded


Show:

- Weight graph
- Progress over time
- Before/after photos


---

## 3. היסטוריה

Create a customer timeline.

Everything important should appear here:

Examples:

01/01
לקוחה נוצרה

03/01
הסכם נחתם

05/01
משקל עודכן:
82 ק"ג

10/01
תפריט חדש הועלה

15/01
שיחת זום התקיימה


Events:

- Customer created
- Weight update
- Measurement update
- Photo upload
- Agreement created
- Menu uploaded
- Meeting completed
- Payment received


---

## 4. תשלומים

Manage subscription:

Fields:

- מסלול
- סכום ששולם
- תאריך התחלה
- תאריך תשלום הבא
- סטטוס תשלום

Payment history:

Example:

01/01
350 ₪
שולם

01/02
350 ₪
ממתין


---

## 5. מסמכים

Store:

- הסכם
- תפריט
- קבצים נוספים

Support:

Upload existing agreement

OR

Generate agreement from the system.


---

## 6. פגישות

Calendar integration.

Features:

- Create Zoom meeting
- Save meeting date
- Add reminder
- Sync with calendar

Meeting history:

Date
Duration
Notes


---

# Create New Customer Flow

Do not create one huge form.

Create a wizard.

Step 1:
פרטים אישיים

- שם
- גיל
- טלפון
- Instagram
- Facebook


Step 2:
פרטי תהליך

- מסלול
- מחיר
- תאריך התחלה
- מקור הגעה


Step 3:
מדידות התחלתיות

- משקל
- היקפים
- תמונות לפני


Step 4:
מסמכים

- Upload agreement
- Generate agreement


---

# Agreement Generator

Create a feature:

"יצירת הסכם"

The user enters:

- Customer name
- Program
- Duration
- Price
- Payment terms

Generate a PDF agreement.

---

# Design Requirements

Style:

- Modern SaaS
- Minimal
- Premium
- Lots of whitespace
- Mobile responsive

Colors:

- White background
- Neutral gray cards
- Green for success
- Orange warnings
- Red overdue payments

Use Hebrew typography.

RTL support everywhere.

---

# Technical Expectations

Before coding:

1. Create the UX structure.
2. Define components.
3. Define database entities.
4. Define relationships.
5. Then implement.

Recommended entities:

Customer:
- id
- name
- age
- description
- phone
- social links
- source
- status
- start date
- program

ProgressMeasurement:
- customerId
- date
- weight
- waist
- thigh
- hip

Photos:
- customerId
- date
- type

Documents:
- customerId
- type
- file

Payments:
- customerId
- amount
- date
- status

Meetings:
- customerId
- date
- notes
- calendarEventId

TimelineEvents:
- customerId
- type
- date
- metadata


Start by creating the project structure and the main Hebrew RTL customer management UI.
Do not over-engineer. Focus on the best user experience.