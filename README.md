# Mo'SQL

## Objective

Today I was given the chance to convince you that the SQL language is worth learning. We only spend some time on the weekend, today and tomorrow working through exercises. Wednesday you will work in groups to plan your midterm project.

It is likely one person in the group will take responsibility for writing the database queries. I've noticed that this person gains a slight advantage. Everyone spends a week writing the same JavaScript, Express Servers and HTML/CSS. Roughly one in three spends a week writing SQL.

Tomorrow you will learn about an abstraction over SQL called Knex. This will allow you to write queries with a JavaScript interface. You are building the queries that you would write in SQL. This is different than Rails week when you will use a library which provides a different way to interact with rows in a database.

The only way that you will be able to take advantage of the benefits of SQL is if you make the decision for yourself. It is someting you want to gain 'above adequate' competency with.

## You vs. Database

The tendency for developers rushing through a bootcamp is to do minimal work with SQL and use JavaScript to structure data. These examples are here to illustrate a couple of important points.

- Writing JavaScript still takes time.
- JavaScript is typically slower working with relational data than a database.
- The amount of data you are working with must be considered.

> I've provided speed measurements that may vary in other environments. All queries were run against the data from [github.com/jensen/sqlintro-notes/](https://github.com/jensen/sqlintro-notes/blob/master/bootcamp/seed.sql).

### Basic Example

Our requirement is that we create a list of all the students. We will provide the id, student name and name for the students cohort. Using relational data let's write the JavaScript code to find this data starting with two arrays of objects.

The students and cohorts tables have the following schema:

```
+-----------------+   +-----------------+
|    students     |   |     cohorts     |
+-----------------+   +-----------------+
| PK | id         |   | PK | id         |
|    | name       |   |    | name       |
|    | email      |   |    | start_date |
|    | phone      |   |    | end_date   |
|    | github     |   +-----------------+
|    | start_date |
|    | end_date   |
| FK | cohort_id  |
+-----------------+
```

In JavaScript we make the query using a JavaScript API for PostgreSQL called [node-postgres](https://github.com/brianc/node-postgres). The data is converted into arrays and objects.

```javascript
const students = [
  {
    id:           /* Number */
    name:         /* String */
    email:        /* String */
    phone:        /* String */
    github:       /* String */
    start_date:   /* Date Object */
    end_date:     /* Date Object */
    cohort_id:    /* Number */
  },
  ...
]

const cohorts = [
  {
    id:           /* Number */
    name:         /* String */
    start_date:   /* Date Object */
    end_date:     /* Date Object */
  },
  ...
]
```

__Basic Query w/ Join in JavaScript__

This code could be written a number of different ways. The pattern goes through each student and for each student it finds the cohort that the student belongs to. It attaches the cohort name to the final result object.

```javascript
/* FROM students */
const result = input.students.map(student => {
  /* JOIN cohorts ON cohort.id = students.cohort_id */
  const cohort = input.cohorts.find(cohort => {
    return cohort.id === student.cohort_id
  })

  /* SELECT
     students.id,
     students.name AS student_name,
     cohorts.name AS cohort_name
  */
  return {
    id: student.id,
    student_name: student.name,
    cohort_name: cohort.name
  }
})
```

We get the same results straight from the database by using a `JOIN`.

__SQL Query__

```sql
SELECT
  students.id,
  students.name AS student_name,
  cohorts.name AS cohort_name
FROM students
JOIN cohorts
ON cohorts.id = students.cohort_id;
```

__Performance__

> The basic query timing includes the two queries `SELECT * FROM students` and `SELECT * FROM cohorts` for the raw data.

```
Basic Query: 27ms
SQL Query : 7ms
```

If we remove the comments then we've essentially written the same code in a different language. The performance for both aren't that bad. The pure SQL query is about 4x faster.

### Complex Example

There are 12 cohorts and 72725 assignment_submissions. We will change the requirements slightly. Now we want to get a list of students and the number of assignments they have each submitted.

__Basic Query w/ Join in JavaScript__

This is a different operation because now we need to count the number of assignments that have the student_id. This code can be written to perform better.

```javascript
/* FROM students */
const result = input.students.map(student => {
  /* JOIN assignment_submissions ON assignment_submissions.student_id = students.id */
  const submissions = input.assignment_submissions.filter(submission => {
    return submission.student_id === student.id
  }).length

  /* SELECT
     students.id,
     students.name,
     count(assignment_submissions.id) AS assignments_complete
  */
  return {
    id: student.id,
    student_name: student.name,
    assignments_complete: submissions
  }
})
```

Using SQL we can do the `GROUP BY` students and a count on the number grouped per student.

__SQL Query__

```sql
SELECT
  students.id,
  students.name,
  count(assignment_submissions.id) AS assignments_complete
FROM students
JOIN assignment_submissions
ON assignment_submissions.student_id = students.id
GROUP BY students.id;
```

Simply pulling the unfiltered data from the data base is a slow operation. The performance is poor because we don't filter before the data is returned.

__Performance__

> The basic query timing includes the two queries `SELECT * FROM students` and `SELECT * FROM cohorts` for the raw data.

```
Basic Query: 1122ms
SQL Query : 42ms
```

### Indexed Version

We can use an indexing pattern to speed the operation up.

```javascript
const indexed = input.assignment_submissions.reduce((previous, current) => {
  const exists = previous[current.student_id]
  previous[current.student_id] = exists === undefined ? 1 : exists + 1
  return previous
}, {})
```

```javascript
const submissions = indexed[student.id]
```

__Performance__

The SQL query is still more than 16x faster.

> The basic query timing includes the two queries `SELECT * FROM students` and `SELECT * FROM cohorts` for the raw data.

```
Basic Query: 712ms
SQL Query : 41ms
```

## Scenarios

The queries that I find the most interesting are the ones that allow us to make sense of our data in ways that are not immediately obvious. We could continue the process of writing JavaScript to do tasks that SQL is better at. My prediction is that every time the JavaScript solution will be slower. It's also likely it will take longer to write and debug.

Here are a number of scenarios to think about.

- Find all inactive cohorts and identify how many assistance requests were made per student on average.
- Find all the students who are currently active and display the number of complete and the total assignments for the program.
- Find all the teachers who are currently active and display the number of assistance requests they completed since the beginning of December.
- Find all active students that have a rating of less than 2.
- Find all active students and display their requests per day and average rating.
- Find out how many assistance requests have been created for each assignment.
- Find out which assignments a specific student hasn't finished.

> These do not ramp up in difficulty. They were randomly added based on the questions I would ask of the data.

### 1. Find all inactive cohorts and identify how many assistance requests were made per student on average

```sql
SELECT
  cohorts.name AS cohort_name,
  count(DISTINCT students.id) AS student_count,
  count(assistance_requests.id) AS ar_count,
  count(assistance_requests.id)/count(DISTINCT students.id) AS student_avg
FROM students
JOIN cohorts
ON cohorts.id = students.cohort_id
JOIN assistance_requests
ON assistance_requests.student_id = students.id
WHERE students.end_date IS NOT NULL
GROUP BY cohorts.id
ORDER BY count(assistance_requests.id)/count(DISTINCT students.id) DESC;
```

> Query Time: 27ms

### 2. Find all the students who are currently active and display the number of complete and the total assignments for the program

```sql
SELECT
  students.name,
  count(assignment_submissions.id) AS completed,
  (SELECT count(id) FROM assignments) AS total
FROM students
JOIN assignment_submissions
ON assignment_submissions.student_id = students.id
WHERE students.end_date IS NULL
GROUP BY students.id;
```

> Query Time: 16ms

### 3. Find all the teachers who are currently active and display the number of assistance requests they completed since the beginning of December

```sql
SELECT
  teachers.name,
  teachers.start_date,
count(assistance_requests.id)
FROM teachers
JOIN assistance_requests
ON assistance_requests.teacher_id = teachers.id
WHERE teachers.is_active AND assistance_requests.created_at >= '2018-12-01'
GROUP BY teachers.id;
```

> Query Time: 6ms

### 4. Find all active students that have a rating of less than 2

```sql
SELECT
  students.name,
  avg(assistance_requests.student_rating),
  cohorts.name AS cohort
FROM students
JOIN cohorts
ON cohorts.id = students.cohort_id
JOIN assistance_requests
ON assistance_requests.student_id = students.id
WHERE students.end_date IS NULL
GROUP BY students.id, cohorts.id
HAVING avg(assistance_requests.student_rating) < 2;
```

> Query Time: 7ms

### 5. Find all active students and display their requests per day and average rating

```sql
SELECT
  students.name,
  count(assistance_requests.id)/DATE_PART('day', '2019-01-01'::timestamp - students.start_date::timestamp) AS perday,
  avg(assistance_requests.student_rating)
FROM students
JOIN assistance_requests
ON assistance_requests.student_id = students.id
WHERE students.end_date IS NULL
GROUP BY students.id;
```

> Query Time: 7ms

### 6. Find out how many assistance requests have been created for each assignment

```sql
SELECT
  assignments.id,
  assignments.name,
  assignments.duration,
  count(assistance_requests.id)
FROM assistance_requests
JOIN assignments
ON assignments.id = assistance_requests.assignment_id
GROUP BY assignments.id
ORDER BY count(assistance_requests.id);
```

> Query Time: 16ms

### 7. Find out which assignments a specific student hasn't finished

```sql
SELECT
  assignments.id,
  assignments.name
FROM assignments
LEFT JOIN assignment_submissions
ON
  assignment_submissions.assignment_id = assignments.id AND
  assignment_submissions.student_id = 159
WHERE assignment_submissions.assignment_id IS NULL
ORDER BY assignments.id;
```

> Query Time: 12ms

## Making Good Decisions

We could do a query to determine which students haven't finished all of their assignments. Then we would end up with a result set that contains those students who haven't even finished the program yet. We can filter out the students who finished the program to see which ones did not complete their assignments.

```sql
SELECT
  students.id,
  students.name,
  count(assignment_submissions.id)
FROM students
JOIN assignment_submissions
ON assignment_submissions.student_id = students.id
WHERE students.end_date IS NOT NULL
GROUP BY students.id
HAVING count(assignment_submissions.id) < (SELECT count(id) FROM assignments);
```

> Query Time: 36ms

This doesn't help us much. We need to be able to know at all times which students are being on their assignments. We need a different query for this. We need to know how many they have completed and how many they should have completed by that day. We need to do some interesting math with dates to filter out any assignments that are in the future.

```sql
SELECT
  students.cohort_id AS cohort_id,
  students.name,
  count(assignment_submissions.id),
  (SELECT count(id) FROM assignments WHERE day < DATE_PART('day', '2019-01-01'::timestamp - students.start_date::timestamp))
FROM students
JOIN assignment_submissions
ON assignment_submissions.student_id = students.id
WHERE students.end_date IS NULL
GROUP BY students.id
HAVING count(assignment_submissions.id) < (SELECT count(id) FROM assignments WHERE day < DATE_PART('day', '2019-01-01'::timestamp - students.start_date::timestamp));
```

> Query Time: 26ms

Because of the initial filter down to the small subset of students the second query runs faster. It also gives us better results.

## Performance

These queries are starting to get pretty complex. It's important to notice the difference between these two queries. The difference is that one finds the data for all students and the second provides a specific student. The second query is much faster than the first.

__SLOW__ (~ 1.7s)

```sql
SELECT
students.id,
students.name,
 (SELECT array_agg(assignments.id)
  FROM assignments
  LEFT JOIN assignment_submissions
  ON
    assignment_submissions.assignment_id = assignments.id AND
    assignment_submissions.student_id = students.id
  WHERE assignment_submissions.assignment_id IS NULL) as remaining
FROM students;
```

__FASTER__ (~ 0.01s)

```sql
SELECT
students.id,
students.name,
 (SELECT array_agg(assignments.id)
  FROM assignments
  LEFT JOIN assignment_submissions
  ON
    assignment_submissions.assignment_id = assignments.id AND
    assignment_submissions.student_id = students.id
  WHERE assignment_submissions.assignment_id IS NULL) AS remaining
FROM students
WHERE students.id = 159;
```

I could see both of these queries being useful. If you are an educator trying to determine which students are behind on their assignments, then a view of all the students makes sense. This query likely wouldn't be run often so the speed is of less concern.

The second query also returns the students id and name which is useful for the first query. I would likely revert to using the query from Scenario Seven to achieve the same goal. We really just need a list of incomplete assignments and we already know which student we are targeting.

## Final Thoughts

Learning this language in a single day is overwhelming. My recommendation is to not worry about the speed of your queries during this week. Learn the language and focus on understanding how to compose queries with the different clauses.

Once you have learned the language any discussion on performance will make more sense. There are many ways to compose a query to get the same results. Some are faster than others.

When searching for queries on stack overflow don't be content just copying and pasting it. Try and recreate it step by step. Eventually you will go on stack overflow and see responses that you will identify as being a sub optimal solution.

## Bonus

In a couple of the above examples we use the array_agg function which is not officially supported by most database implementations. There are a lot of [aggregate](https://www.postgresql.org/docs/current/static/functions-aggregate.html) functions that can be used with PostgreSQL.

PostgreSQL supports the storage of JSON and Array data types. There are some situations where storing your data using these types makes sense. Don't over do it.
