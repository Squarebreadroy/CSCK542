const express = require('express');
const db = require('./db');
const bodyParser = require('body-parser');
const errorHandler = require('./errorHandler');

const app = express();
app.use(bodyParser.json());

// Middleware to check user role
async function checkUserRole(req, res, next) {
    const { UserId } = req.body;
    if (!UserId) {
        return next({ status: 400, message: 'UserId is required' });
    }
    try {
        const [rows] = await db.execute('SELECT Role FROM roles WHERE RoleID = (SELECT RoleID FROM users WHERE UserId = ?)', [UserId]);
        if (rows.length === 0) {
            return next({ status: 404, message: 'User not found' });
        }
        req.user = UserId;
        req.userRole = rows[0]?.Role;
        next();
    } catch (error) {
        next(error);  // Forward error to centralized error handler
    }
}

// Middleware to authorize based on roles
function authorize(roles) {
    return (req, res, next) => {
        if (!req.userRole) {
            return next({ status: 500, message: 'Internal Server Error: User role not set' });
        }
        if (!roles.includes(req.userRole)) {
            return next({ status: 403, message: 'Forbidden: You do not have the required permissions' });
        }
        next();
    };
}

// Route handlers
app.post('/assign-course', checkUserRole, authorize(['Admin']), async (req, res, next) => {
    const { teacherId, courseId } = req.body;
    if (!teacherId || !courseId) {
        return next({ status: 400, message: 'teacherId and courseId are required' });
    }
    try {
        // Check if the teacher exists and is authorized
        const [teacherRows] = await db.execute('SELECT * FROM users WHERE UserId = ? AND RoleID = (SELECT RoleID FROM roles WHERE Role = ?)', [teacherId, 'Teacher']);
        if (teacherRows.length === 0) {
            return next({ status: 404, message: 'Teacher not found or not authorized' });
        }

        // Check if the enrolment already exists
        const [existingEnrolment] = await db.execute('SELECT * FROM courses WHERE TeacherId = ? AND CourseID = ?', [teacherId, courseId]);
        if (existingEnrolment.length > 0) {
            return next({ status: 400, message: 'Assignement already exists' });
        }
        await db.execute('Update courses SET TeacherId = ? WHERE CourseId = ?', [teacherId, courseId]);
        res.status(201).json({ message: 'Course assigned to teacher' });
    } catch (error) {
        next(error);
    }
});

app.post('/courses-availability/:courseId', checkUserRole, authorize(['Admin']), async (req, res, next) => {
    const { courseId } = req.params;
    const { isAvailable } = req.body;
    try {
        const [course] = await db.execute('SELECT TeacherID FROM courses WHERE CourseID = ?', [courseId]);
        if (course.length === 0) {
            return next({ status: 404, message: 'Course not found' });
        }
        if (course[0].TeacherID === 0) {
            return next({ status: 400, message: 'Assign a teacher to the course before changing its availability' });
        }
        await db.execute('UPDATE courses SET isAvailable = ? WHERE CourseID = ?', [isAvailable, courseId]);
        res.status(200).json({ message: `Availability of Course ${courseId}: ${isAvailable ? 'Enabled' : 'Disabled'}` });
    } catch (error) {
        next(error);
    }
});

app.post('/update-status', checkUserRole, authorize(['Teacher']), async (req, res, next) => {
    const { UserId, studentId, mark, courseId } = req.body;
    if (!studentId || !mark || !courseId) {
        return next({ status: 400, message: 'studentId, mark, and courseId are required' });
    }
    try {
        // Check the teacher whether assigned to the course, and student whether enrolled to the course
        const [rows] = await db.execute('SELECT * FROM courses WHERE TeacherID = ? AND CourseID = ?', [UserId, courseId]);
        const [enrolled] = await db.execute('SELECT * FROM enrolments WHERE UserId = ? AND CourseID = ?', [studentId, courseId]);
        if (rows.length === 0) {
            return next({ status: 404, message: 'Teacher has no permission to update this course' });
        } else if (enrolled.length === 0) {
            return next({ status: 404, message: 'Student is not enrolled in this course' });
        } else {
            await db.execute('UPDATE enrolments SET Mark = ? WHERE UserId = ? AND CourseID = ?', [mark, studentId, courseId]);
            res.status(200).json({ message: 'Course status updated' });
        }
    } catch (error) {
        next(error);
    }
});
app.get('/checkgrade',checkUserRole, authorize(['Student']), async (req, res, next) => {
    const { UserId } = req.body;
    try {
        const [rows] = await db.execute('SELECT e.CourseID, c.Title, e.Mark FROM enrolments e LEFT JOIN courses c ON e.CourseID=c.CourseID WHERE e.UserID = ?', [UserId]);
        res.status(200).json(rows);        
    } catch (error) {
        next(error);
    }
})

app.get('/available-courses', async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT CourseID, Title, u.Name FROM courses c LEFT JOIN users u ON c.TeacherID=u.UserID WHERE isAvailable = 1');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

app.post('/enrollments', checkUserRole, authorize(['Student']), async (req, res, next) => {
    const { UserId, courseId } = req.body;
    if (!courseId) {
        return next({ status: 400, message: 'courseId is required' });
    }
    try {
        // Check the availablility of course
        const [course] = await db.execute('SELECT isAvailable FROM courses WHERE CourseID = ?', [courseId]);
        if (course.length === 0 || course[0].isAvailable === 0) {
            return next({ status: 400, message: 'Course is not available for enrollment' });
        }
        // Check to avoid duplicate rows
        const [enrollment] = await db.execute('SELECT * FROM enrolments WHERE CourseID = ? AND UserId = ?', [courseId, UserId]);
        if (enrollment.length > 0) {
            return next({ status: 400, message: 'Already enrolled in this course' });
        } else {
            await db.execute('INSERT INTO enrolments (UserId, CourseID, Mark) VALUES (?, ?, ?)', [UserId, courseId, -1]);
            res.status(201).json({ message: 'Successfully enrolled in course' });
        }
    } catch (error) {
        next(error);
    }
});

// Testing endpoint with query parameter
app.get('/', (req, res) => {
    const { UserId } = req.query; // Changed to req.query
    res.status(200).json({ UserId });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
