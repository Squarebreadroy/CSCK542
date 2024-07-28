# College Course Management API

This is a Node.js-based API for managing college courses, featuring role-based access control for Admins, Teachers, and Students. The API supports functionalities such as course enrollment, course assignment, grade management, and course catalog display.

## Features
Admin:
- Assign courses to teachers.
- Manage course availability and details.
Teacher:
- Update and manage grades for enrolled students.
Student:
- Enroll in available courses.
- Check grades.
General:
- View available courses.

## Technologies Used
- Node.js
- Express.js
- MySQL
- body-parser for parsing JSON request bodies

## Getting Started
Prerequisites
- Node.js installed on your machine
- MySQL database set up


# API Endpoints

Admin Endpoints
### Assign Course to Teacher
POST /assign-course

Request Body: { "teacherId": "1", "courseId": "101" }

Response: 201 Created with message

### Manage Course Availability
POST /courses-availability/:courseId

Request Body: { "isAvailable": true }

Response: 200 OK with message

## Teacher Endpoints
### Update Student Grade
POST /update-status

Request Body: { "UserId": "2", "studentId": "3", "mark": "90", "courseId": "101" }

Response: 200 OK with message

## Student Endpoints
### Enroll in a Course
POST /enrollments

Request Body: { "UserId": "3", "courseId": "101" } 

Response: 201 Created with message

### Check Grades
GET /checkgrade

Request Body: { "UserId": "3" } 

Response: 200 OK with grades

## General Endpoints
### Get Available Courses
GET /available-courses

Response: 200 OK with course list


## Error Handling
Errors are handled centrally using an error handler middleware. The middleware catches all errors and sends a structured response with appropriate status codes and messages.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License.
