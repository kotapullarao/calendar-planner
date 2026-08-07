/**
 * Application Constants
 * Static values used throughout the application
 */

// Month Names
export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// SVG Icons
export const ICONS = {
    delete: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    duplicate: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`
};

// Gradient Themes - Modern & Appealing Collection
export const GRADIENT_THEMES = {
    // Classic theme (default)
    classic: {
        name: 'Classic',
        colors: 'Indigo • Pink',
        gradient: 'linear-gradient(135deg, #6366f1, #ec4899)',
        shadow: 'rgba(99, 102, 241, 0.35)'
    },
    
    // Vibrant & Modern Gradients
    neon: {
        name: 'Neon Glow',
        colors: 'Electric Blue • Cyan',
        gradient: 'linear-gradient(135deg, #00d4ff, #090979)',
        shadow: 'rgba(0, 212, 255, 0.3)'
    },
    sunset: {
        name: 'Sunset Blaze',
        colors: 'Orange • Magenta',
        gradient: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
        shadow: 'rgba(255, 126, 95, 0.3)'
    },
    aurora: {
        name: 'Aurora Borealis',
        colors: 'Green • Blue',
        gradient: 'linear-gradient(135deg, #00f260, #0575e6)',
        shadow: 'rgba(0, 242, 96, 0.3)'
    },
    cosmic: {
        name: 'Cosmic Purple',
        colors: 'Deep Purple • Pink',
        gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        shadow: 'rgba(102, 126, 234, 0.3)'
    },
    ocean: {
        name: 'Ocean Depths',
        colors: 'Teal • Blue',
        gradient: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
        shadow: 'rgba(33, 147, 176, 0.3)'
    },
    fire: {
        name: 'Fire Gradient',
        colors: 'Red • Orange',
        gradient: 'linear-gradient(135deg, #ee0979, #ff6a00)',
        shadow: 'rgba(238, 9, 121, 0.3)'
    },
    forest: {
        name: 'Forest Mist',
        colors: 'Green • Lime',
        gradient: 'linear-gradient(135deg, #56ab2f, #a8e6cf)',
        shadow: 'rgba(86, 171, 47, 0.3)'
    },
    royal: {
        name: 'Royal Gold',
        colors: 'Gold • Purple',
        gradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
        shadow: 'rgba(247, 151, 30, 0.3)'
    },
    
    // Softer Premium Gradients  
    lavender: {
        name: 'Lavender Dream',
        colors: 'Lavender • Pink',
        gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)',
        shadow: 'rgba(168, 237, 234, 0.25)'
    },
    peach: {
        name: 'Peach Glow',
        colors: 'Peach • Coral',
        gradient: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
        shadow: 'rgba(255, 236, 210, 0.25)'
    },
    mint: {
        name: 'Mint Fresh',
        colors: 'Mint • Sky',
        gradient: 'linear-gradient(135deg, #a8e6cf, #dcedc1)',
        shadow: 'rgba(168, 230, 207, 0.25)'
    },
    rose: {
        name: 'Rose Gold',
        colors: 'Rose • Gold',
        gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
        shadow: 'rgba(240, 147, 251, 0.25)'
    }
};

// Application Configuration
export const APP_CONFIG = {
    STORAGE_KEYS: {
        CONFIG: 'calendar-plan-config',
        THEME: 'calendar-plan-theme',
        GRADIENT_THEME: 'calendar-plan-gradient-theme',
        EMOJI_USAGE: 'emoji-usage',
        RECENT_EMOJIS: 'recent-emojis',
        STATS_HIDDEN: 'calendar-plan-stats-hidden'
    },
    
    PWA_ACTIONS: {
        NEW_CATEGORY: 'new-category',
        TODAY: 'today',
        MANAGE: 'manage',
        IMPORT: 'import'
    },
    
    THEMES: {
        LIGHT: 'light',
        MIDNIGHT: 'midnight'
    },
    
    CATEGORY_TYPES: {
        SINGLE: 'single',
        GROUP: 'group'
    }
};

// Category Templates - Comprehensive Collection
export const CATEGORY_TEMPLATES = {
    'Work & Business': [
        { id: 'work-schedule', name: 'Work Schedule', emoji: '💼', color: '#3b82f6', description: 'Track your working days and office hours' },
        { id: 'meetings', name: 'Meetings & Calls', emoji: '🤝', color: '#6366f1', description: 'Schedule meetings, calls, and conferences' },
        { id: 'project-deadlines', name: 'Project Deadlines', emoji: '🎯', color: '#ef4444', description: 'Track important milestones and deliverables' },
        { id: 'business-travel', name: 'Business Travel', emoji: '✈️', color: '#0891b2', description: 'Work trips and corporate travel' },
        { id: 'training', name: 'Training & Development', emoji: '🎓', color: '#7c3aed', description: 'Professional training and skill development' },
        { id: 'client-work', name: 'Client Work', emoji: '👔', color: '#059669', description: 'Client meetings and project work' },
        { id: 'presentations', name: 'Presentations', emoji: '📊', color: '#dc2626', description: 'Prepare and deliver presentations' },
        { id: 'team-building', name: 'Team Building', emoji: '👥', color: '#0d9488', description: 'Team events and corporate activities' }
    ],
    'Personal & Life': [
        { id: 'personal-time', name: 'Personal Time', emoji: '🏠', color: '#10b981', description: 'Me time and personal activities' },
        { id: 'family-time', name: 'Family Time', emoji: '👨‍👩‍👧‍👦', color: '#f59e0b', description: 'Quality time with family' },
        { id: 'social-events', name: 'Social Events', emoji: '🎉', color: '#ec4899', description: 'Parties, gatherings, and social activities' },
        { id: 'date-nights', name: 'Date Nights', emoji: '💕', color: '#f43f5e', description: 'Romantic evenings and couple time' },
        { id: 'hobbies', name: 'Hobbies & Interests', emoji: '🎨', color: '#8b5cf6', description: 'Personal hobbies and creative pursuits' },
        { id: 'self-care', name: 'Self Care', emoji: '🧘‍♀️', color: '#06b6d4', description: 'Wellness, meditation, and self-care' },
        { id: 'birthdays', name: 'Birthdays & Anniversaries', emoji: '🎂', color: '#f59e0b', description: 'Special celebrations and milestones' },
        { id: 'volunteering', name: 'Volunteering', emoji: '🤲', color: '#059669', description: 'Community service and volunteer work' }
    ],
    'Health & Wellness': [
        { id: 'fitness-routine', name: 'Fitness & Workouts', emoji: '💪', color: '#dc2626', description: 'Gym sessions and exercise routines' },
        { id: 'medical', name: 'Medical Appointments', emoji: '👨‍⚕️', color: '#0891b2', description: 'Doctor visits and health checkups' },
        { id: 'mental-health', name: 'Mental Health', emoji: '🧠', color: '#8b5cf6', description: 'Therapy, counseling, and mental wellness' },
        { id: 'nutrition', name: 'Meal Planning', emoji: '🥗', color: '#059669', description: 'Healthy eating and meal prep' },
        { id: 'sports', name: 'Sports & Activities', emoji: '⚽', color: '#ea580c', description: 'Sports leagues and recreational activities' },
        { id: 'yoga-meditation', name: 'Yoga & Meditation', emoji: '🧘', color: '#7c3aed', description: 'Mindfulness and spiritual practice' },
        { id: 'sleep-schedule', name: 'Sleep Schedule', emoji: '😴', color: '#1f2937', description: 'Track sleep patterns and rest' },
        { id: 'dental', name: 'Dental Care', emoji: '🦷', color: '#06b6d4', description: 'Dental appointments and oral health' }
    ],
    'Travel & Vacation': [
        { id: 'vacation', name: 'Vacation Time', emoji: '🏖️', color: '#f59e0b', description: 'Holiday breaks and vacation days' },
        { id: 'weekend-trips', name: 'Weekend Getaways', emoji: '🏔️', color: '#059669', description: 'Short trips and mini vacations' },
        { id: 'travel-planning', name: 'Travel Planning', emoji: '🗺️', color: '#0891b2', description: 'Research and plan upcoming trips' },
        { id: 'international-travel', name: 'International Travel', emoji: '🌍', color: '#7c3aed', description: 'Overseas trips and global adventures' },
        { id: 'road-trips', name: 'Road Trips', emoji: '🚗', color: '#dc2626', description: 'Driving adventures and road journeys' },
        { id: 'camping', name: 'Camping & Outdoors', emoji: '🏕️', color: '#10b981', description: 'Outdoor adventures and camping trips' },
        { id: 'city-breaks', name: 'City Breaks', emoji: '🏙️', color: '#6366f1', description: 'Urban exploration and city visits' },
        { id: 'cruise-vacation', name: 'Cruise & Water', emoji: '🚢', color: '#0891b2', description: 'Water-based vacations and cruises' }
    ],
    'Education & Learning': [
        { id: 'study-schedule', name: 'Study Sessions', emoji: '📚', color: '#7c3aed', description: 'Academic study and exam preparation' },
        { id: 'courses', name: 'Online Courses', emoji: '💻', color: '#0891b2', description: 'Online learning and skill courses' },
        { id: 'language-learning', name: 'Language Learning', emoji: '🗣️', color: '#059669', description: 'Foreign language practice and classes' },
        { id: 'workshops', name: 'Workshops & Seminars', emoji: '🛠️', color: '#ea580c', description: 'Educational workshops and seminars' },
        { id: 'reading', name: 'Reading Time', emoji: '📖', color: '#6366f1', description: 'Book reading and literature' },
        { id: 'research', name: 'Research Projects', emoji: '🔍', color: '#8b5cf6', description: 'Academic or personal research' },
        { id: 'certifications', name: 'Certifications', emoji: '🏆', color: '#f59e0b', description: 'Professional certification goals' },
        { id: 'music-lessons', name: 'Music Lessons', emoji: '🎵', color: '#ec4899', description: 'Musical instrument practice and lessons' }
    ],
    'Home & Family': [
        { id: 'household-tasks', name: 'Household Tasks', emoji: '🧹', color: '#6b7280', description: 'Cleaning, organizing, and home maintenance' },
        { id: 'kids-activities', name: 'Kids Activities', emoji: '👶', color: '#f59e0b', description: 'Children\'s events and activities' },
        { id: 'pet-care', name: 'Pet Care', emoji: '🐕', color: '#059669', description: 'Pet appointments and care routines' },
        { id: 'home-projects', name: 'Home Improvement', emoji: '🔨', color: '#ea580c', description: 'DIY projects and home renovations' },
        { id: 'gardening', name: 'Gardening', emoji: '🌱', color: '#10b981', description: 'Garden maintenance and plant care' },
        { id: 'family-meals', name: 'Family Meals', emoji: '🍽️', color: '#dc2626', description: 'Family dinner and meal times' },
        { id: 'school-events', name: 'School Events', emoji: '🏫', color: '#7c3aed', description: 'Parent-teacher meetings and school activities' },
        { id: 'babysitting', name: 'Childcare', emoji: '🍼', color: '#ec4899', description: 'Childcare and babysitting arrangements' }
    ],
    'Entertainment & Hobbies': [
        { id: 'movie-nights', name: 'Movie & TV Time', emoji: '🎬', color: '#1f2937', description: 'Entertainment and media consumption' },
        { id: 'gaming', name: 'Gaming Sessions', emoji: '🎮', color: '#6366f1', description: 'Video games and gaming time' },
        { id: 'photography', name: 'Photography', emoji: '📸', color: '#0891b2', description: 'Photo shoots and photography projects' },
        { id: 'cooking', name: 'Cooking & Baking', emoji: '👨‍🍳', color: '#ea580c', description: 'Culinary adventures and recipe experiments' },
        { id: 'crafts', name: 'Arts & Crafts', emoji: '✂️', color: '#ec4899', description: 'Creative projects and handmade crafts' },
        { id: 'music-practice', name: 'Music Practice', emoji: '🎸', color: '#7c3aed', description: 'Musical instrument practice time' },
        { id: 'board-games', name: 'Games & Puzzles', emoji: '🎲', color: '#059669', description: 'Board games and puzzle time' },
        { id: 'collecting', name: 'Collecting', emoji: '🏺', color: '#f59e0b', description: 'Hobby collecting and organizing collections' }
    ],
    'Special Events': [
        { id: 'weddings', name: 'Weddings & Ceremonies', emoji: '💒', color: '#ec4899', description: 'Wedding events and special ceremonies' },
        { id: 'holidays', name: 'Holiday Celebrations', emoji: '🎄', color: '#dc2626', description: 'Holiday planning and celebrations' },
        { id: 'festivals', name: 'Festivals & Concerts', emoji: '🎪', color: '#7c3aed', description: 'Music festivals and live events' },
        { id: 'competitions', name: 'Competitions & Contests', emoji: '🏅', color: '#f59e0b', description: 'Competitive events and contests' },
        { id: 'conferences', name: 'Conferences & Conventions', emoji: '🏢', color: '#0891b2', description: 'Professional conferences and industry events' },
        { id: 'graduations', name: 'Graduations & Milestones', emoji: '🎓', color: '#059669', description: 'Academic and personal achievements' },
        { id: 'religious-events', name: 'Religious Events', emoji: '⛪', color: '#8b5cf6', description: 'Religious services and spiritual events' },
        { id: 'community-events', name: 'Community Events', emoji: '🏘️', color: '#6b7280', description: 'Local community activities and events' }
    ]
};

// Default configuration
export const DEFAULT_CONFIG = {
    eventCategories: []
};