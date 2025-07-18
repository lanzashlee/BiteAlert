# BiteAlert

A comprehensive rabies bite case management and vaccine distribution system that helps healthcare providers track, manage, and respond to rabies bite incidents efficiently.

## Features

- Real-time bite case tracking and management
- Prescriptive analytics for vaccine distribution
- Risk assessment and prioritization
- Automated vaccine stock management
- Interactive dashboard with data visualization
- Barangay-level case monitoring
- Smart vaccine allocation recommendations

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js
- Database: MongoDB
- Server: Node.js Express

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/BiteAlert.git
```

2. Install dependencies:
```bash
npm install
```

3. Set up MongoDB:
   - Install MongoDB if you haven't already
   - Start MongoDB service
   - Create a database named `bitealert`

4. Configure the application:
   - Create a `.env` file in the root directory
   - Add your MongoDB connection string:
     ```
     MONGODB_URI=mongodb://localhost:27017/bitealert
     PORT=3000
     ```

5. Start the application:
```bash
npm start
```

6. Access the application:
   - Open your browser
   - Navigate to `http://localhost:3000`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Your Name - your.email@example.com

Project Link: [https://github.com/yourusername/BiteAlert](https://github.com/yourusername/BiteAlert)

## Deploying to Render

To deploy this project to [Render](https://render.com):

1. **Push your code to GitHub.**
2. **Create a new Web Service on Render:**
   - Connect your GitHub repo.
   - Set the build command to `npm install` (or leave blank).
   - Set the start command to `npm start`.
3. **Set Environment Variables in Render:**
   - `MONGODB_URI` (your MongoDB Atlas connection string)
   - `EMAIL_USER` (for nodemailer, if used)
   - `EMAIL_PASSWORD` (for nodemailer, if used)
   - Any other secrets your app requires
4. **Allow Render's IPs in MongoDB Atlas Network Access.**
5. **Visit your Render URL after deployment!**

**Note:** Never commit your `.env` file or secrets to your repository. Use environment variables in the Render dashboard for all sensitive data. 