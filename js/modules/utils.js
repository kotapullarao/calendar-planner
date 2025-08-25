/**
 * Utility Functions Module
 * Contains all utility functions for date formatting, validation, and other helpers
 */

// Utility Functions Object
export const Utils = {
    /**
     * Format a Date object to YYYY-MM-DD string
     */
    formatDate: date => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Convert YYYY-MM-DD to DD-MM-YYYY for display
     */
    formatDateForDisplay: (dateStr) => {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
    },

    /**
     * Convert DD-MM-YYYY to YYYY-MM-DD for native inputs
     */
    formatDateForNative: (dateStr) => {
        if (!dateStr || !/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) return '';
        const [day, month, year] = dateStr.split('-');
        // Ensure day and month are zero-padded
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    },

    /**
     * Validate DD-MM-YYYY date format
     */
    validateDate: (dateStr) => {
        if (!/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) return false;
        const [day, month, year] = dateStr.split('-').map(Number);
        if (month < 1 || month > 12 || day < 1 || year < 1000) return false;

        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    },

    /**
     * Check if a date falls within any of the given date ranges
     */
    isDateInRanges: (date, ranges) => {
        if (!ranges) return false;
        const formattedDate = Utils.formatDate(date);
        return ranges.some(range => {
            if (typeof range === 'string') return formattedDate === range;
            return range?.start && range?.end && formattedDate >= range.start && formattedDate <= range.end;
        });
    },

    /**
     * Generate a random hex color
     */
    getRandomColor: () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),

    /**
     * Comprehensive emoji detection and management system
     */
    getEmoji: (title) => {
        const emojiMap = { 
            // Work & Professional
            'work': '💼', 'office': '🏢', 'meeting': '🤝', 'presentation': '📊', 'deadline': '⏰', 
            'project': '📋', 'team': '👥', 'conference': '🎤', 'interview': '💼', 'client': '🤝',
            'training': '🎯', 'workshop': '🛠️', 'seminar': '📋', 'webinar': '💻', 'review': '👀',
            
            // Personal & Life Events
            'birthday': '🎂', 'anniversary': '💍', 'wedding': '💒', 'graduation': '🎓', 'date': '❤️',
            'family': '👨‍👩‍👧‍👦', 'kids': '👶', 'baby': '🍼', 'parent': '👪', 'friend': '👫', 'party': '🎉',
            
            // Health & Medical
            'doctor': '👨‍⚕️', 'dentist': '🦷', 'hospital': '🏥', 'pharmacy': '💊', 'checkup': '🩺',
            'gym': '💪', 'workout': '🏋️', 'yoga': '🧘', 'massage': '💆', 'therapy': '🛏️',
            'running': '🏃', 'cycling': '🚴', 'swimming': '🏊', 'sport': '⚽', 'tennis': '🎾',
            
            // Travel & Transportation  
            'flight': '✈️', 'travel': '🧳', 'vacation': '🏖️', 'holiday': '🎉', 'hotel': '🏨',
            'car': '🚗', 'train': '🚄', 'bus': '🚌', 'taxi': '🚕', 'trip': '🗺️', 'cruise': '🚢',
            
            // Food & Dining
            'lunch': '🍽️', 'dinner': '🍽️', 'breakfast': '🥐', 'coffee': '☕', 'drinks': '🍺',
            'restaurant': '🍴', 'cooking': '👨‍🍳', 'pizza': '🍕', 'sushi': '🍱', 'bbq': '🍖',
            
            // Education & Learning
            'school': '🎒', 'exam': '📝', 'study': '📚', 'course': '📖', 'class': '🎓',
            'homework': '📝', 'test': '📊', 'lecture': '🎤', 'library': '📚', 'research': '🔍',
            
            // Entertainment & Hobbies
            'movie': '🎬', 'music': '🎵', 'concert': '🎪', 'theater': '🎭', 'game': '🎲',
            'reading': '📖', 'art': '🎨', 'photography': '📸', 'dance': '💃', 'singing': '🎤',
            
            // Home & Maintenance
            'home': '🏠', 'cleaning': '🧹', 'repair': '🔧', 'garden': '🌱', 'pets': '🐕',
            'shopping': '🛒', 'groceries': '🥕', 'laundry': '👕', 'cooking': '🍳', 'diy': '🔨',
            
            // Financial & Bills
            'bill': '💸', 'bank': '🏦', 'payment': '💳', 'tax': '📄', 'insurance': '🛡️',
            'investment': '📈', 'budget': '💰', 'salary': '💵', 'expense': '📉', 'savings': '🏦',
            
            // Special Occasions & Holidays
            'valentine': '💑', 'easter': '🐰', 'halloween': '🎃', 'christmas': '🎅', 
            'new year': '🍾', 'thanksgiving': '🦃', 'mothers day': '🌸',
            
            // Remote Work & Modern Life
            'wfh': '🏠', 'remote': '💻', 'zoom': '📹', 'call': '📞', 'email': '📧',
            'deadline': '🕒', 'task': '✅', 'goal': '🎯', 'priority': '🔴', 'urgent': '🚨',
            
            // Emotions & Feelings
            'happy': '😊', 'sad': '😢', 'excited': '🤩', 'love': '😍', 'angry': '😠',
            'funny': '😂', 'laugh': '🤣', 'smile': '😊', 'cry': '😭', 'cool': '😎',
            'sick': '🤒', 'tired': '😴', 'surprised': '😲', 'worried': '😰', 'proud': '😌'
        };
        
        const lowerTitle = title.toLowerCase();
        for (const keyword in emojiMap) {
            if (lowerTitle.includes(keyword)) return emojiMap[keyword];
        }
        return '🗓️';
    },

    /**
     * Get most commonly used emojis for quick picker
     */
    getPopularEmojis: () => [
        '😀', '😊', '😍', '🥰', '😎', '🤩', '😂', '🤣', '😭', '😢',
        '🗓️', '💼', '🏠', '❤️', '🎉', '✈️', '🍽️', '💪', '📚', '🎬',
        '☕', '🚗', '👨‍⚕️', '🛒', '📝', '🎵', '📞', '💻', '🎯', '⚽',
        '🏖️', '🎂', '💒', '🏥', '🎓', '🍕', '🎨', '📸', '🔧', '💸',
        '🌟', '🔥', '💎', '🦄', '🌈', '⭐', '🚀', '🎊', '🏆', '💡',
        '🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '☀️', '🌙', '⚡', '💫'
    ],

    /**
     * Get emoji categories for full picker
     */
    getEmojiCategories: () => ({
        'Smileys & Emotions': [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇', '🥰',
            '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗',
            '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄',
            '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴',
            '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯',
            '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
            '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
            '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '❤️',
            '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
            '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
            '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑',
            '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️'
        ],
        'Work & Business': [
            '💼', '🏢', '🤝', '📊', '⏰', '📋', '👥', '🎤', '💻', '📧', '📞', '🎯', '📈', '💰', '📉',
            '💳', '🏦', '📄', '🛡️', '📝', '✅', '🔴', '🚨', '📹', '💵', '📐', '🖊️', '📓', '🔍', '💡',
            '🏛️', '⚖️', '🏗️', '🏭', '🚧', '⚙️', '🔧', '🔨', '⛏️', '🛠️', '🔩', '⚗️', '🧪', '🔬', '📡',
            '👔', '👗', '💺', '🗂️', '📁', '📂', '🗃️', '🗄️', '📇', '📌', '📍', '📎', '🖇️', '✂️', '📏',
            '📐', '📌', '🔖', '🏷️', '📑', '📃', '📜', '📰', '🗞️', '📔', '📕', '📖', '📗', '📘', '📙',
            '📚', '📓', '📒', '📝', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📮', '📭', '📬', '📫', '📪',
            '🤖', '💾', '🖥️', '💿', '💽', '🔌', '🔋', '⌚', '📱', '💻', '🖨️', '⌨️', '🖱️', '🖲️', '🕹️',
            '🎮', '📀', '💿', '💾', '💽', '🗜️', '📺', '📻', '🎛️', '🎚️', '🎙️', '📢', '📣', '🔊', '🔉'
        ],
        'People & Body': [
            '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈',
            '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '🫶',
            '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃',
            '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '🫦', '💋', '👨', '👩', '👴', '👵',
            '👦', '👧', '🧒', '👶', '👼', '🧑‍🦰', '👨‍🦰', '👩‍🦰', '🧑‍🦱', '👨‍🦱', '👩‍🦱', '🧑‍🦳', '👨‍🦳', '👩‍🦳', '🧑‍🦲',
            '👨‍🦲', '👩‍🦲', '🧔', '🧔‍♂️', '🧔‍♀️', '👱', '👱‍♂️', '👱‍♀️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️',
            '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️',
            '🙋‍♀️', '🧏', '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️',
            '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🌾', '👨‍🌾', '👩‍🌾', '🧑‍🍳', '👨‍🍳', '👩‍🍳', '🧑‍🎓', '👨‍🎓', '👩‍🎓'
        ],
        'Personal & Life': [
            '❤️', '👪', '👫', '🎉', '🎂', '💍', '💒', '🎓', '👶', '🍼', '👨‍👩‍👧‍👦', '💕', '🌹', '🎁', '💌',
            '🧒', '👼', '🤰', '🤱', '👰', '🤵', '💏', '💑', '💐', '💎', '🌺', '🌻', '🌷', '🥀', '🌼',
            '🌸', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '💝', '🎈', '🎀', '🎊', '🎁', '🕯️', '🎂',
            '🍰', '🧁', '🥂', '🍾', '🥳', '🎭', '🎪', '🎨', '🎬', '👑', '💄', '👜', '👛', '🕶️', '👓',
            '🎩', '👒', '⛑️', '🪖', '💐', '🌿', '☘️', '🍀', '🌱', '👕', '👖', '👔', '👗', '👘', '🥻',
            '🩱', '🩲', '🩳', '👙', '👚', '👛', '👜', '👝', '🛍️', '💒', '🏰', '🗽', '🎪', '🎠', '🎡',
            '🎢', '🎨', '🎭', '🎬', '🎸', '🎺', '🎻', '🥁', '🎹', '💋', '💄', '👄', '💅', '🤳', '💆‍♀️',
            '💆‍♂️', '💇‍♀️', '💇‍♂️', '🧖‍♀️', '🧖‍♂️', '🧚‍♀️', '🧚‍♂️', '🧞‍♀️', '🧞‍♂️'
        ],
        'Health & Fitness': [
            '👨‍⚕️', '🏥', '💊', '🩺', '💪', '🏋️', '🧘', '💆', '🏃', '🚴', '🏊', '⚽', '🎾', '🏀', '⛳',
            '🦷', '💉', '🩹', '🩼', '♿', '🧬', '🫀', '🧠', '👁️', '🦴', '🤸', '🤾', '🏄', '⛷️', '🏂',
            '🤺', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏟️', '⚾', '🏐', '🏈', '🏉', '🎱', '🏓', '🏸',
            '🥊', '🥋', '🤿', '🏇', '🧗‍♀️', '🧗‍♂️', '🏌️‍♀️', '🏌️‍♂️', '🏄‍♀️', '🏄‍♂️', '🚣‍♀️', '🚣‍♂️', '🏊‍♀️', '🏊‍♂️',
            '🚴‍♀️', '🚴‍♂️', '🚵‍♀️', '🚵‍♂️', '🤾‍♀️', '🤾‍♂️', '🤼‍♀️', '🤼‍♂️', '🤽‍♀️', '🤽‍♂️', '🏃‍♀️', '🏃‍♂️', '🚶‍♀️', '🚶‍♂️'
        ],
        'Travel & Transport': [
            '✈️', '🧳', '🏖️', '🗺️', '🏨', '🚗', '🚄', '🚌', '🚕', '🚢', '🏔️', '🏝️', '🗽', '🎡', '🎢',
            '🚁', '🚂', '🚃', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚍', '🚘', '🚖',
            '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🚤', '⛵', '🛳️', '⛴️', '🚀', '🛸', '🎠', '🎪',
            '🛣️', '🛤️', '🛢️', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🚁', '🪂', '💺', '🛬',
            '🛫', '🛩️', '🛰️', '🚁', '🚟', '🚠', '🚡', '⛲', '🎡', '🎢', '🎠', '🏛️', '🏟️', '🎭', '🗼',
            '🌉', '🌁', '🏙️', '🏞️', '🏜️', '🏔️', '⛰️', '🌋', '🏕️', '🏖️', '🏝️', '🛖', '🏘️', '🏚️', '🏗️'
        ],
        'Food & Dining': [
            '🍽️', '☕', '🥐', '🍕', '🍱', '🍖', '🍴', '👨‍🍳', '🍺', '🍷', '🥗', '🍰', '🧀', '🥑', '🍓',
            '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🫐', '🍈', '🍒', '🥝', '🥭', '🍑', '🥥', '🍅', '🌶️',
            '🥒', '🥬', '🥦', '🧄', '🧅', '🌽', '🥕', '🫒', '🥖', '🍞', '🥯', '🧈', '🥞', '🧇', '🍳',
            '🥓', '🍗', '🍟', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍜', '🍲', '🍝', '🍛',
            '🍣', '🍤', '🦪', '🍥', '🥮', '🍘', '🍙', '🍚', '🫖', '🍵', '🧋', '🧃', '🥤', '🧊', '🍼',
            '🍻', '🥂', '🍾', '🍸', '🍹', '🍶', '🥃', '🍮', '🍯', '🍪', '🎂', '🧁', '🍫', '🍬', '🍭'
        ],
        'Education & Learning': [
            '🎒', '📚', '📝', '📖', '🎓', '🏫', '👩‍🏫', '🔬', '📐', '🖊️', '📓', '🎨', '🔍', '💡', '🧠',
            '✏️', '📏', '📌', '📍', '🖇️', '📎', '✂️', '📋', '📁', '📂', '🗂️', '📅', '📆', '🗓️', '📊',
            '📉', '📈', '📇', '🗃️', '🗄️', '🗑️', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💼'
        ],
        'Entertainment': [
            '🎬', '🎵', '🎪', '🎭', '🎲', '🎸', '🎯', '📱', '🎮', '📺', '🎧', '📻', '🎺', '🥁', '🎹',
            '🎤', '🎬', '🎞️', '📽️', '🎥', '📹', '📷', '📸', '🔍', '🎨', '🖌️', '🖍️', '✨', '🎊', '🎉',
            '🎈', '🎀', '🎁', '🏆', '🥇', '🎗️', '🎟️', '🎫', '🎪', '🤹', '🎳', '🎯', '🎰', '🧩', '♠️'
        ],
        'Home & Life': [
            '🏠', '🧹', '🔧', '🌱', '🐕', '🐱', '🛒', '🥕', '👕', '🍳', '🔨', '🪴', '🛏️', '🚿', '🍞',
            '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩',
            '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺', '🌁', '🌃', '🏙️', '🌄', '🌅'
        ],
        'Nature & Weather': [
            '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '⭐', '🌟',
            '💫', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️',
            '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌊', '💧', '💦', '☔', '☂️', '🌍', '🌎', '🌏', '🌐',
            '🌲', '🌳', '🌴', '🌵', '🌶️', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪴', '🌱', '🌊',
            '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏞️', '🌅', '🌄', '🌠', '🌌', '🌉', '♨️', '💎', '🪨', '🌪️',
            '🌀', '🌊', '🌈', '🔥', '💥', '❄️', '☃️', '⛄', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️'
        ],
        'Animals & Pets': [
            '🐕', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
            '🐒', '🦍', '🦧', '🐶', '🐺', '🐴', '🦄', '🦓', '🦌', '🐂', '🐃', '🐄', '🐖', '🐗', '🐏',
            '🐑', '🐐', '🦙', '🦒', '🐘', '🦏', '🦛', '🐪', '🐫', '🦘', '🐨', '🦡', '🦔', '🦇', '🐀',
            '🦈', '🐙', '🦑', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦭', '🦦', '🦨', '🦝',
            '🐾', '🐕‍🦺', '🐈‍⬛', '🦮', '🐩', '🦴', '🥩', '🍖', '🥛', '🧸', '🪀', '🎾', '🥎', '⚾', '🏐',
            '🐛', '🦋', '🐌', '🐝', '🪲', '🐞', '🦗', '🕷️', '🦂', '🦟', '🪰', '🪱', '🐚', '🦪', '🕸️',
            '🦅', '🦆', '🦢', '🦉', '🦚', '🦜', '🦩', '🐧', '🕊️', '🐓', '🐔', '🐣', '🐤', '🐥', '🦃',
            '🦎', '🐍', '🐢', '🦕', '🦖', '🐊', '🐲', '🐉', '🦂', '🕸️', '🐜', '🪳', '🦟', '🪰', '🐝'
        ],
        'Sports & Activities': [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥍', '🏑', '🏒', '🥌',
            '🛷', '⛸️', '🥊', '🥋', '🤺', '🏇', '⛷️', '🏂', '🏄', '🚣', '🧗', '🚴', '🚵', '🧘', '🤸',
            '🤹', '🤾', '🧗', '🏋️', '🤺', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️', '🎫', '🎟️', '🎪',
            '🏊', '🏄‍♂️', '🏄‍♀️', '🤽', '🚣‍♂️', '🚣‍♀️', '🧗‍♂️', '🧗‍♀️', '🚴‍♂️', '🚴‍♀️', '🚵‍♂️', '🚵‍♀️', '🤸‍♂️', '🤸‍♀️', '🧘‍♂️',
            '🧘‍♀️', '🏋️‍♂️', '🏋️‍♀️', '🤾‍♂️', '🤾‍♀️', '🤹‍♂️', '🤹‍♀️', '🏃‍♂️', '🏃‍♀️', '🚶‍♂️', '🚶‍♀️', '🧎', '🧍', '👟', '👠',
            '🥾', '🩰', '👢', '👡', '🩱', '🩲', '🩳', '👙', '🧥', '🥽', '🤿', '🎣', '🏹', '🎯', '🪃'
        ],
        'Holidays & Events': [
            '🎃', '🎅', '🐰', '🍾', '🦃', '🌸', '💑', '🎆', '🎇', '🕯️', '🎊', '🥂', '🍀', '❄️',
            '🎄', '🎁', '🔔', '❄️', '☃️', '🎂', '🕯️', '🎉', '🎈', '🎀', '💝', '💐', '🌹', '💒', '👰',
            '🤵', '💍', '🥳', '🍰', '🧁', '🍪', '🥧', '🍫', '🍬', '🍭', '🎪', '🎭', '🎨', '🎬', '📸',
            '🎊', '🥳', '🎉', '🎈', '🎁', '🎀', '🏆', '🥇', '🏅', '🎗️', '🏵️', '🌟', '⭐', '✨', '🎯',
            '🎲', '🃏', '🎰', '🎮', '🕹️', '🎳', '🎪', '🎭', '🎨', '🖼️', '🎼', '🎵', '🎶', '🎤', '🎧',
            '📻', '🎸', '🎹', '🎺', '🎷', '🪕', '🥁', '🎻', '🪈', '🪗', '🎚️', '🎛️', '🎙️', '📢', '📣'
        ],
        'Magic & Fantasy': [
            '🦄', '🌟', '⭐', '✨', '🌙', '🔮', '🪄', '🧙‍♀️', '🧙‍♂️', '🧚‍♀️', '🧚‍♂️', '🧞‍♀️', '🧞‍♂️', '🧝‍♀️', '🧝‍♂️',
            '🦸‍♀️', '🦸‍♂️', '🦹‍♀️', '🦹‍♂️', '🧛‍♀️', '🧛‍♂️', '🧟‍♀️', '🧟‍♂️', '👹', '👺', '👻', '💀', '☠️', '👽', '👾',
            '🤖', '🎭', '🎪', '🔥', '💫', '🌠', '🌈', '⚡', '🔸', '🔹', '💎', '💍', '👑', '⚔️', '🛡️'
        ],
        'Symbols & Objects': [
            '💯', '💥', '💦', '💨', '🕳️', '💣', '💢', '💤', '💡', '🔦', '🕯️', '🪔', '🔥', '💥', '⚡',
            '🌟', '⭐', '✨', '💫', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻',
            '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟫', '⬛', '⬜',
            '🔈', '🔉', '🔊', '🔇', '📢', '📣', '📯', '🔔', '🔕', '🎵', '🎶', '🎼', '🎤', '🎧', '📻'
        ],
        'Places & Geography': [
            '🗺️', '🌍', '🌎', '🌏', '🌐', '🗾', '🏔️', '⛰️', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🌋', '🗻',
            '🏛️', '🏟️', '🏗️', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪',
            '🏫', '🏬', '🏭', '🏯', '🏰', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛺',
            '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '💈'
        ],
        'Flags & Countries': [
            '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇨🇦', '🇦🇺',
            '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇲🇽', '🇷🇺', '🇿🇦', '🇳🇱', '🇧🇪', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱',
            '🇨🇭', '🇦🇹', '🇵🇹', '🇬🇷', '🇹🇷', '🇪🇬', '🇸🇦', '🇮🇷', '🇮🇶', '🇮🇱', '🇦🇪', '🇰🇼', '🇴🇲', '🇶🇦', '🇧🇭',
            '🇮🇪', '🇮🇸', '🇱🇺', '🇲🇹', '🇲🇨', '🇦🇩', '🇱🇮', '🇸🇲', '🇻🇦', '🇭🇺', '🇨🇿', '🇸🇰', '🇸🇮', '🇭🇷', '🇷🇸'
        ]
    }),

    /**
     * Get flag emoji with fallback for better cross-platform support
     */
    getFlagEmoji: (countryCode) => {
        const flagMap = {
            'US': '🇺🇸', 'GB': '🇬🇧', 'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'ES': '🇪🇸', 'CA': '🇨🇦', 'AU': '🇦🇺',
            'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺', 'ZA': '🇿🇦',
            'NL': '🇳🇱', 'BE': '🇧🇪', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CH': '🇨🇭'
        };
        
        const fallbackMap = {
            'US': 'USA', 'GB': 'UK', 'FR': 'FR', 'DE': 'DE', 'IT': 'IT', 'ES': 'ES', 'CA': 'CA', 'AU': 'AU',
            'JP': 'JP', 'KR': 'KR', 'CN': 'CN', 'IN': 'IN', 'BR': 'BR', 'MX': 'MX', 'RU': 'RU', 'ZA': 'ZA',
            'NL': 'NL', 'BE': 'BE', 'SE': 'SE', 'NO': 'NO', 'DK': 'DK', 'FI': 'FI', 'PL': 'PL', 'CH': 'CH'
        };
        
        const flag = flagMap[countryCode];
        const fallback = fallbackMap[countryCode];
        
        // Test if emoji renders properly (basic check)
        const testElement = document.createElement('span');
        testElement.innerHTML = flag;
        testElement.style.position = 'absolute';
        testElement.style.visibility = 'hidden';
        document.body.appendChild(testElement);
        
        const hasProperSupport = testElement.offsetWidth > 0;
        document.body.removeChild(testElement);
        
        return hasProperSupport ? flag : (fallback || countryCode);
    },

    /**
     * Enhanced emoji validation and fallback system (currently disabled for emoji picker)
     */
    validateEmoji: (emoji) => {
        // For now, return emoji as-is to let browsers handle flag rendering
        // This allows users to see actual flag emojis where supported
        return emoji;
        
        // The fallback system below can be re-enabled if needed for specific platforms
        /*
        const problematicPatterns = [
            /[\u{1F3F4}][\u{E0067}-\u{E007F}]+/u,            // Subdivision flag sequences (keep this)
            /[\u{1F469}\u{1F468}][\u{200D}]/u,               // Complex family emojis
            /[\u{1F9B0}-\u{1F9B3}]/u                         // Newer hair component emojis
        ];
        
        const isProblematic = problematicPatterns.some(pattern => pattern.test(emoji));
        
        if (isProblematic) {
            const fallbacks = {
                '🇺🇸': '🗽', '🇬🇧': '🏰', '🇫🇷': '🗼', '🇩🇪': '🏰', '🇮🇹': '🍕', 
                '🇪🇸': '🏰', '🇨🇦': '🍁', '🇦🇺': '🦘', '🇯🇵': '🏯', '🇰🇷': '🏯',
                '🇨🇳': '🏮', '🇮🇳': '🕌', '🇧🇷': '⚽', '🇲🇽': '🌶️', '🇷🇺': '🏰'
            };
            return fallbacks[emoji] || '🌍';
        }
        */
        
        return emoji;
    },

    /**
     * Save user's emoji usage for smart suggestions
     */
    saveEmojiUsage: (emoji) => {
        try {
            const usage = JSON.parse(localStorage.getItem('emoji-usage') || '{}');
            usage[emoji] = (usage[emoji] || 0) + 1;
            localStorage.setItem('emoji-usage', JSON.stringify(usage));
        } catch (e) {
            // Fallback silently if localStorage fails
        }
    },

    /**
     * Get user's most used emojis
     */
    getMostUsedEmojis: () => {
        try {
            const usage = JSON.parse(localStorage.getItem('emoji-usage') || '{}');
            return Object.entries(usage)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 12)
                .map(([emoji]) => emoji);
        } catch (e) {
            return [];
        }
    },

    /**
     * Get recent emoji selections
     */
    getRecentEmojis: () => {
        try {
            return JSON.parse(localStorage.getItem('recent-emojis') || '[]').slice(0, 6);
        } catch (e) {
            return [];
        }
    },

    /**
     * Save recent emoji selection
     */
    saveRecentEmoji: (emoji) => {
        try {
            let recent = JSON.parse(localStorage.getItem('recent-emojis') || '[]');
            // Remove if already exists
            recent = recent.filter(e => e !== emoji);
            // Add to front
            recent.unshift(emoji);
            // Keep only last 20
            recent = recent.slice(0, 20);
            localStorage.setItem('recent-emojis', JSON.stringify(recent));
        } catch (e) {
            // Fallback silently if localStorage fails
        }
    },

    /**
     * Get popular category name suggestions organized by type
     */
    getPopularCategoryNames: () => ({
        'Work & Professional': [
            'Work', 'Office', 'Meetings', 'Project Deadlines', 'Team Events', 'Business Travel',
            'Training', 'Conferences', 'Client Meetings', 'Performance Reviews', 'Team Building',
            'Workshops', 'Presentations', 'Networking Events', 'Company Events', 'Remote Work'
        ],
        'Personal & Life': [
            'Personal', 'Family Time', 'Friends', 'Social Events', 'Date Nights', 'Me Time',
            'Hobbies', 'Personal Projects', 'Self Care', 'Personal Development', 'Life Events',
            'Birthdays', 'Anniversaries', 'Special Occasions', 'Personal Goals', 'Relaxation'
        ],
        'Health & Wellness': [
            'Doctor Appointments', 'Dental Care', 'Fitness', 'Gym Sessions', 'Yoga Classes',
            'Medical Checkups', 'Therapy Sessions', 'Wellness Activities', 'Mental Health',
            'Nutrition Planning', 'Health Goals', 'Exercise Routine', 'Meditation', 'Spa Days'
        ],
        'Travel & Vacation': [
            'Vacation', 'Travel Plans', 'Business Travel', 'Weekend Trips', 'Holiday Travel',
            'Flight Schedules', 'Hotel Bookings', 'Road Trips', 'International Travel',
            'Travel Preparation', 'Vacation Planning', 'Adventure Travel', 'City Breaks'
        ],
        'Education & Learning': [
            'Classes', 'Study Sessions', 'Exams', 'Course Deadlines', 'Educational Events',
            'Skill Development', 'Online Courses', 'Workshops', 'Certifications', 'Learning Goals',
            'Academic Calendar', 'Study Groups', 'Research Projects', 'Educational Travel'
        ],
        'Home & Family': [
            'Household Tasks', 'Home Maintenance', 'Family Activities', 'Kids Events',
            'School Events', 'Parent Meetings', 'Home Projects', 'Garden Work', 'Pet Care',
            'Family Gatherings', 'Home Improvements', 'Cleaning Schedule', 'Family Traditions'
        ],
        'Financial & Administrative': [
            'Bill Payments', 'Tax Deadlines', 'Insurance', 'Banking', 'Investment Reviews',
            'Financial Planning', 'Budget Reviews', 'Administrative Tasks', 'Document Renewal',
            'Legal Matters', 'Contract Reviews', 'Financial Goals', 'Expense Tracking'
        ]
    }),

    /**
     * Get smart category name suggestions based on input
     */
    getSuggestedCategoryNames: (input = '') => {
        const allCategories = Utils.getPopularCategoryNames();
        const allNames = Object.values(allCategories).flat();
        
        if (!input.trim()) {
            // Return most popular suggestions when no input
            return [
                'Work', 'Personal', 'Vacation', 'Family', 'Health', 'Travel',
                'Meetings', 'Doctor Appointments', 'Social Events', 'Projects'
            ];
        }
        
        const lowerInput = input.toLowerCase();
        const matches = [];
        
        // Exact matches first
        allNames.forEach(name => {
            if (name.toLowerCase() === lowerInput) {
                matches.push(name);
            }
        });
        
        // Starts with matches
        allNames.forEach(name => {
            if (name.toLowerCase().startsWith(lowerInput) && !matches.includes(name)) {
                matches.push(name);
            }
        });
        
        // Contains matches
        allNames.forEach(name => {
            if (name.toLowerCase().includes(lowerInput) && !matches.includes(name)) {
                matches.push(name);
            }
        });
        
        return matches.slice(0, 8); // Return top 8 matches
    },

    /**
     * Save category name usage for smart suggestions
     */
    saveCategoryNameUsage: (categoryName) => {
        try {
            const usage = JSON.parse(localStorage.getItem('category-name-usage') || '{}');
            usage[categoryName] = (usage[categoryName] || 0) + 1;
            localStorage.setItem('category-name-usage', JSON.stringify(usage));
        } catch (e) {
            // Fallback silently if localStorage fails
        }
    },

    /**
     * Get user's most used category names
     */
    getMostUsedCategoryNames: () => {
        try {
            const usage = JSON.parse(localStorage.getItem('category-name-usage') || '{}');
            return Object.entries(usage)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([name]) => name);
        } catch (e) {
            return [];
        }
    },

    /**
     * Get recent category name selections
     */
    getRecentCategoryNames: () => {
        try {
            return JSON.parse(localStorage.getItem('recent-category-names') || '[]').slice(0, 4);
        } catch (e) {
            return [];
        }
    },

    /**
     * Save recent category name selection
     */
    saveRecentCategoryName: (categoryName) => {
        try {
            let recent = JSON.parse(localStorage.getItem('recent-category-names') || '[]');
            // Remove if already exists
            recent = recent.filter(name => name !== categoryName);
            // Add to front
            recent.unshift(categoryName);
            // Keep only last 15
            recent = recent.slice(0, 15);
            localStorage.setItem('recent-category-names', JSON.stringify(recent));
        } catch (e) {
            // Fallback silently if localStorage fails
        }
    },

    /**
     * Get smart category name suggestions combining recent and most used
     * Similar to emoji smart suggestions
     */
    getSmartCategoryNameSuggestions: () => {
        const mostUsed = Utils.getMostUsedCategoryNames();
        const recent = Utils.getRecentCategoryNames();
        
        // Combine and deduplicate, prioritizing recent items
        const combined = [...new Set([...recent, ...mostUsed])];
        
        // Return up to 8 suggestions (2 rows of 4)
        return combined.slice(0, 8);
    },

    /**
     * Comprehensive emoji search database with keywords
     */
    getEmojiSearchDatabase: () => ({
        // Smileys & Emotions
        '😀': ['grinning', 'happy', 'smile', 'joy', 'cheerful', 'excited'],
        '😃': ['smiley', 'happy', 'joy', 'haha', 'cheerful', 'grin'],
        '😄': ['smile', 'happy', 'joy', 'laugh', 'cheerful', 'pleased'],
        '😁': ['grin', 'happy', 'smile', 'joy', 'cheerful', 'beaming'],
        '😆': ['laughing', 'happy', 'haha', 'lol', 'satisfied', 'pleased'],
        '😅': ['sweat', 'smile', 'hot', 'happy', 'laugh', 'relief'],
        '🤣': ['rofl', 'laughing', 'lol', 'haha', 'funny', 'hilarious'],
        '😂': ['tears', 'laughing', 'lol', 'haha', 'funny', 'crying'],
        '🙂': ['smile', 'happy', 'positive', 'slightly', 'content'],
        '🙃': ['upside', 'sarcasm', 'silly', 'playful', 'irony'],
        '😉': ['wink', 'flirt', 'playful', 'cheeky', 'joke'],
        '😊': ['blush', 'happy', 'smile', 'pleased', 'bashful'],
        '😇': ['angel', 'innocent', 'halo', 'good', 'pure'],
        '🥰': ['love', 'heart', 'adore', 'crush', 'affection'],
        '😍': ['heart-eyes', 'love', 'crush', 'adore', 'star-struck'],
        '🤩': ['star', 'eyes', 'excited', 'starstruck', 'amazing'],
        '😘': ['kiss', 'love', 'heart', 'romance', 'blow kiss'],
        '😗': ['kiss', 'whistle', 'lips', 'smooch'],
        '☺️': ['relaxed', 'happy', 'blush', 'pleasant', 'content'],
        '😚': ['kiss', 'closed', 'eyes', 'love', 'affection'],
        '😙': ['kiss', 'smiling', 'eyes', 'love', 'smooch'],
        '🥲': ['happy', 'cry', 'tear', 'bittersweet', 'touched'],
        '😋': ['yum', 'tongue', 'delicious', 'savoring', 'tasty'],
        '😛': ['tongue', 'playful', 'cheeky', 'silly', 'tease'],
        '😜': ['wink', 'tongue', 'playful', 'crazy', 'silly'],
        '🤪': ['zany', 'crazy', 'wild', 'silly', 'goofy'],
        '😝': ['tongue', 'closed', 'eyes', 'playful', 'silly'],
        '🤑': ['money', 'rich', 'cash', 'greedy', 'dollar'],
        '🤗': ['hug', 'embrace', 'love', 'care', 'support'],
        '🤭': ['oops', 'giggle', 'secret', 'shy', 'hand over mouth'],
        '🤫': ['shh', 'quiet', 'secret', 'silence', 'whisper'],
        '🤔': ['thinking', 'hmm', 'consider', 'ponder', 'wonder'],
        '🤐': ['zipper', 'mouth', 'sealed', 'secret', 'quiet'],
        '🤨': ['raised', 'eyebrow', 'suspicious', 'skeptical', 'doubt'],
        '😐': ['neutral', 'meh', 'straight', 'face', 'expressionless'],
        '😑': ['expressionless', 'blank', 'meh', 'deadpan', 'unimpressed'],
        '😶': ['no', 'mouth', 'silence', 'speechless', 'quiet'],
        '😏': ['smirk', 'smug', 'sly', 'devious', 'mischievous'],
        '😒': ['unamused', 'meh', 'bored', 'unimpressed', 'indifferent'],
        '🙄': ['eye', 'roll', 'annoyed', 'whatever', 'sarcastic'],
        '😬': ['grimace', 'awkward', 'oops', 'eek', 'cringe'],
        '😔': ['sad', 'down', 'unhappy', 'disappointed', 'dejected'],
        '😪': ['sleepy', 'tired', 'sad', 'sick', 'bored'],
        '🤤': ['drool', 'sleep', 'hungry', 'desire', 'want'],
        '😴': ['sleep', 'tired', 'zzz', 'nap', 'rest'],
        '😷': ['mask', 'sick', 'doctor', 'covid', 'ill'],
        '🤒': ['thermometer', 'sick', 'fever', 'ill', 'unwell'],
        '🤕': ['bandage', 'hurt', 'injured', 'sick', 'wound'],
        '🤢': ['nausea', 'sick', 'green', 'ill', 'disgust'],
        '🤮': ['vomit', 'sick', 'puke', 'ill', 'disgusted'],
        '🤧': ['sneeze', 'sick', 'tissue', 'cold', 'gesundheit'],
        '🥵': ['hot', 'heat', 'sweat', 'fever', 'summer'],
        '🥶': ['cold', 'freeze', 'frozen', 'blue', 'winter'],
        '😎': ['cool', 'sunglasses', 'awesome', 'smooth', 'confident'],
        '🤓': ['nerd', 'geek', 'glasses', 'smart', 'clever'],
        '🧐': ['monocle', 'thinking', 'inspect', 'curious', 'examine'],
        '😕': ['confused', 'disappointed', 'sad', 'worried', 'uncertain'],
        '😟': ['worried', 'concerned', 'anxious', 'upset', 'troubled'],
        '🙁': ['sad', 'disappointed', 'unhappy', 'down', 'frown'],
        '☹️': ['frown', 'sad', 'unhappy', 'disappointed', 'upset'],
        '😮': ['wow', 'surprised', 'amazed', 'open', 'mouth'],
        '😯': ['surprised', 'wow', 'amazed', 'speechless', 'stunned'],
        '😲': ['astonished', 'shocked', 'surprised', 'wow', 'amazed'],
        '😳': ['flushed', 'embarrassed', 'shy', 'surprise', 'blush'],
        '🥺': ['pleading', 'puppy', 'eyes', 'cute', 'beg'],
        '😦': ['frowning', 'sad', 'worried', 'concerned', 'upset'],
        '😧': ['anguished', 'worried', 'sad', 'concerned', 'distressed'],
        '😨': ['fearful', 'scared', 'afraid', 'worried', 'anxious'],
        '😰': ['anxious', 'sweat', 'worried', 'nervous', 'concerned'],
        '😥': ['sad', 'sweat', 'worried', 'disappointed', 'relieved'],
        '😢': ['cry', 'sad', 'tear', 'unhappy', 'upset'],
        '😭': ['crying', 'sad', 'tears', 'bawling', 'upset'],
        '😱': ['scream', 'scared', 'shocked', 'afraid', 'terrified'],
        '😖': ['confounded', 'sad', 'cry', 'frustrated', 'upset'],
        '😣': ['persevere', 'struggle', 'persevere', 'sad', 'helpless'],
        '😞': ['disappointed', 'sad', 'upset', 'dejected', 'down'],
        '😓': ['sweat', 'sad', 'tired', 'hard', 'work'],
        '😩': ['weary', 'tired', 'sad', 'frustrated', 'fed up'],
        '😫': ['tired', 'fed up', 'frustrated', 'distraught', 'upset'],
        '😤': ['huff', 'proud', 'mad', 'annoyed', 'frustrated'],
        '😡': ['angry', 'mad', 'hate', 'red', 'fuming'],
        '😠': ['angry', 'mad', 'annoyed', 'frustrated', 'grumpy'],
        '🤬': ['swearing', 'cursing', 'angry', 'mad', 'symbols'],
        '😈': ['devil', 'horns', 'evil', 'mischievous', 'naughty'],
        '👿': ['devil', 'angry', 'horns', 'mad', 'evil'],
        '💀': ['skull', 'dead', 'danger', 'poison', 'deadly'],
        '☠️': ['skull', 'bones', 'danger', 'pirate', 'poison'],
        '💩': ['poop', 'shit', 'crap', 'pile', 'dung'],
        '🤡': ['clown', 'face', 'funny', 'circus', 'joker'],
        '👹': ['ogre', 'monster', 'red', 'mask', 'japanese'],
        '👺': ['goblin', 'red', 'mask', 'angry', 'japanese'],
        '👻': ['ghost', 'halloween', 'scary', 'boo', 'spooky'],
        '👽': ['alien', 'ufo', 'extraterrestrial', 'space', 'et'],
        '👾': ['alien', 'monster', 'game', 'arcade', 'invader'],
        '🤖': ['robot', 'face', 'machine', 'bot', 'ai'],

        // Work & Business 
        '💼': ['briefcase', 'work', 'business', 'job', 'office', 'professional'],
        '🏢': ['office', 'building', 'work', 'business', 'corporate', 'company'],
        '🤝': ['handshake', 'deal', 'agreement', 'meeting', 'partnership', 'cooperation'],
        '📊': ['chart', 'graph', 'data', 'statistics', 'analytics', 'presentation'],
        '⏰': ['clock', 'time', 'deadline', 'alarm', 'schedule', 'meeting'],
        '📋': ['clipboard', 'list', 'tasks', 'checklist', 'notes', 'planning'],
        '👥': ['people', 'team', 'group', 'meeting', 'colleagues', 'users'],
        '🎤': ['microphone', 'presentation', 'speech', 'conference', 'meeting', 'talk'],
        '💻': ['laptop', 'computer', 'work', 'coding', 'programming', 'tech'],
        '📧': ['email', 'mail', 'message', 'communication', 'inbox', 'contact'],
        '📞': ['phone', 'call', 'telephone', 'communication', 'contact', 'ring'],
        '🎯': ['target', 'goal', 'aim', 'objective', 'focus', 'dart'],
        '📈': ['trending', 'up', 'growth', 'increase', 'success', 'profit'],
        '💰': ['money', 'cash', 'dollar', 'rich', 'wealth', 'salary'],
        '💳': ['credit', 'card', 'payment', 'money', 'banking', 'purchase'],
        '🏦': ['bank', 'money', 'finance', 'building', 'institution', 'savings'],

        // Travel & Transport
        '✈️': ['plane', 'airplane', 'flight', 'travel', 'vacation', 'trip'],
        '🧳': ['luggage', 'suitcase', 'travel', 'vacation', 'trip', 'packing'],
        '🏖️': ['beach', 'vacation', 'sand', 'sun', 'holiday', 'relaxation'],
        '🗺️': ['map', 'world', 'travel', 'navigation', 'geography', 'explore'],
        '🏨': ['hotel', 'accommodation', 'travel', 'vacation', 'building', 'stay'],
        '🚗': ['car', 'vehicle', 'drive', 'transport', 'auto', 'road'],
        '🚄': ['train', 'bullet', 'fast', 'transport', 'railway', 'speed'],
        '🚌': ['bus', 'vehicle', 'transport', 'public', 'commute', 'travel'],
        '🚕': ['taxi', 'cab', 'vehicle', 'transport', 'yellow', 'ride'],
        '🚢': ['ship', 'boat', 'cruise', 'ocean', 'travel', 'water'],

        // Food & Dining
        '🍽️': ['dinner', 'meal', 'food', 'restaurant', 'eating', 'plate'],
        '☕': ['coffee', 'drink', 'morning', 'caffeine', 'cup', 'hot'],
        '🥐': ['croissant', 'bread', 'breakfast', 'french', 'pastry', 'bakery'],
        '🍕': ['pizza', 'food', 'italian', 'cheese', 'slice', 'dinner'],
        '🍱': ['bento', 'box', 'japanese', 'food', 'lunch', 'meal'],
        '🍖': ['meat', 'bone', 'food', 'bbq', 'carnivore', 'protein'],
        '🍴': ['fork', 'knife', 'cutlery', 'eating', 'utensils', 'restaurant'],
        '👨‍🍳': ['chef', 'cook', 'cooking', 'kitchen', 'food', 'restaurant'],
        '🍺': ['beer', 'drink', 'alcohol', 'cheers', 'party', 'pub'],
        '🍷': ['wine', 'drink', 'alcohol', 'glass', 'red', 'celebration'],

        // Health & Fitness
        '👨‍⚕️': ['doctor', 'medical', 'health', 'physician', 'hospital', 'healthcare'],
        '🏥': ['hospital', 'medical', 'health', 'doctor', 'emergency', 'care'],
        '💊': ['pill', 'medicine', 'drug', 'pharmacy', 'health', 'medication'],
        '🩺': ['stethoscope', 'doctor', 'medical', 'health', 'checkup', 'exam'],
        '💪': ['muscle', 'strong', 'strength', 'gym', 'fitness', 'workout'],
        '🏋️': ['weight', 'lifting', 'gym', 'fitness', 'exercise', 'workout'],
        '🧘': ['yoga', 'meditation', 'zen', 'peace', 'mindfulness', 'relax'],
        '💆': ['massage', 'spa', 'relaxation', 'wellness', 'therapy', 'self-care'],
        '🏃': ['running', 'exercise', 'fitness', 'sport', 'jog', 'cardio'],
        '🚴': ['cycling', 'bike', 'bicycle', 'exercise', 'sport', 'fitness'],

        // Nature & Weather
        '🌞': ['sun', 'sunny', 'bright', 'day', 'weather', 'hot'],
        '🌙': ['moon', 'night', 'crescent', 'dark', 'sleep', 'evening'],
        '⭐': ['star', 'night', 'space', 'sky', 'twinkle', 'wish'],
        '🌟': ['glowing', 'star', 'sparkle', 'special', 'shine', 'bright'],
        '💫': ['dizzy', 'star', 'sparkle', 'magic', 'dizzy', 'cosmic'],
        '✨': ['sparkles', 'magic', 'shine', 'glitter', 'special', 'clean'],
        '⚡': ['lightning', 'thunder', 'electric', 'power', 'energy', 'fast'],
        '🔥': ['fire', 'flame', 'hot', 'burn', 'lit', 'trending'],
        '🌈': ['rainbow', 'colors', 'pride', 'weather', 'spectrum', 'happy'],
        '☀️': ['sun', 'sunny', 'bright', 'day', 'weather', 'summer'],
        '🌤️': ['partly', 'cloudy', 'sun', 'weather', 'mixed', 'day'],
        '⛅': ['cloud', 'partly', 'cloudy', 'weather', 'mixed', 'day'],
        '🌦️': ['rain', 'sun', 'weather', 'shower', 'mixed', 'day'],
        '🌧️': ['rain', 'weather', 'storm', 'wet', 'precipitation', 'cloudy'],
        '⛈️': ['thunder', 'storm', 'lightning', 'rain', 'weather', 'dark'],
        '🌩️': ['lightning', 'weather', 'storm', 'electric', 'thunder', 'bolt'],
        '🌨️': ['snow', 'weather', 'cold', 'winter', 'flake', 'white'],
        '❄️': ['snowflake', 'cold', 'winter', 'snow', 'ice', 'frozen'],
        '☃️': ['snowman', 'winter', 'snow', 'cold', 'christmas', 'build'],
        '⛄': ['snowman', 'winter', 'snow', 'cold', 'carrot', 'nose'],
        '🌬️': ['wind', 'blow', 'breeze', 'air', 'weather', 'face'],
        '🌊': ['wave', 'water', 'ocean', 'sea', 'surf', 'beach'],

        // Animals & Pets
        '🐕': ['dog', 'pet', 'puppy', 'animal', 'loyal', 'friend'],
        '🐱': ['cat', 'pet', 'kitten', 'animal', 'meow', 'feline'],
        '🐭': ['mouse', 'animal', 'small', 'rodent', 'cheese', 'cute'],
        '🐹': ['hamster', 'pet', 'animal', 'small', 'cute', 'rodent'],
        '🐰': ['rabbit', 'bunny', 'animal', 'cute', 'easter', 'hop'],
        '🦊': ['fox', 'animal', 'clever', 'orange', 'wild', 'cunning'],
        '🐻': ['bear', 'animal', 'strong', 'wild', 'teddy', 'brown'],
        '🐼': ['panda', 'bear', 'animal', 'cute', 'bamboo', 'china'],
        '🐨': ['koala', 'animal', 'cute', 'australia', 'tree', 'bear'],
        '🐯': ['tiger', 'animal', 'cat', 'wild', 'stripes', 'fierce'],
        '🦁': ['lion', 'animal', 'king', 'wild', 'mane', 'cat'],
        '🐮': ['cow', 'animal', 'farm', 'milk', 'moo', 'cattle'],
        '🐷': ['pig', 'animal', 'farm', 'pink', 'oink', 'swine'],
        '🐸': ['frog', 'animal', 'green', 'ribbit', 'pond', 'amphibian'],
        '🐵': ['monkey', 'animal', 'banana', 'jungle', 'primates', 'swing'],

        // Symbols & Objects
        '💯': ['hundred', 'perfect', 'score', 'complete', 'full', 'achievement'],
        '💥': ['boom', 'explosion', 'bang', 'comic', 'crash', 'impact'],
        '💦': ['sweat', 'drops', 'water', 'splash', 'wet', 'exercise'],
        '💨': ['dash', 'wind', 'fast', 'speed', 'running', 'puff'],
        '💣': ['bomb', 'explosive', 'danger', 'blast', 'boom', 'dynamite'],
        '💢': ['anger', 'comic', 'mad', 'frustrated', 'symbol', 'pop'],
        '💤': ['sleep', 'zzz', 'tired', 'nap', 'rest', 'snore'],
        '💡': ['idea', 'light', 'bulb', 'innovation', 'bright', 'eureka'],
        '🔦': ['flashlight', 'torch', 'light', 'search', 'dark', 'beam'],
        '🕯️': ['candle', 'light', 'flame', 'romantic', 'wax', 'dinner'],

        // Flags & Countries (basic search terms)
        '🇺🇸': ['usa', 'america', 'united', 'states', 'american', 'flag'],
        '🇬🇧': ['uk', 'britain', 'england', 'british', 'union', 'jack'],
        '🇫🇷': ['france', 'french', 'paris', 'tricolor', 'flag'],
        '🇩🇪': ['germany', 'german', 'deutschland', 'berlin', 'flag'],
        '🇮🇹': ['italy', 'italian', 'rome', 'flag'],
        '🇪🇸': ['spain', 'spanish', 'madrid', 'flag'],
        '🇨🇦': ['canada', 'canadian', 'maple', 'leaf', 'flag'],
        '🇦🇺': ['australia', 'australian', 'aussie', 'flag'],
        '🇯🇵': ['japan', 'japanese', 'tokyo', 'flag'],
        '🇰🇷': ['korea', 'korean', 'south', 'flag'],
        '🇨🇳': ['china', 'chinese', 'beijing', 'flag'],
        '🇮🇳': ['india', 'indian', 'delhi', 'flag'],
        '🇧🇷': ['brazil', 'brazilian', 'portuguese', 'flag'],
        '🇲🇽': ['mexico', 'mexican', 'flag'],
        '🇷🇺': ['russia', 'russian', 'moscow', 'flag'],
        
        // More Popular Emojis (2025 trending)
        '❤️‍🔥': ['heart', 'fire', 'passion', 'intense', 'burning', 'love'],
        '❤️‍🩹': ['heart', 'bandage', 'healing', 'mending', 'recovery', 'broken'],
        '🫶': ['heart', 'hands', 'love', 'care', 'support', 'hug'],
        '🫰': ['hand', 'heart', 'love', 'korean', 'finger', 'gesture'],
        '🥹': ['pleading', 'puppy', 'eyes', 'sad', 'cute', 'emotional'],
        '🫡': ['salute', 'respect', 'military', 'honor', 'acknowledgment'],
        '🫠': ['melting', 'hot', 'embarrassed', 'dissolving', 'overwhelmed'],
        '🥴': ['woozy', 'dizzy', 'confused', 'drunk', 'intoxicated', 'spinning'],
        '🤌': ['pinched', 'fingers', 'italian', 'gesture', 'chef', 'kiss'],
        '🫵': ['pointing', 'you', 'finger', 'direct', 'accusation'],
        '🫤': ['diagonal', 'mouth', 'meh', 'unsure', 'so-so', 'uncertain'],
        '🙈': ['see', 'no', 'evil', 'monkey', 'embarrassed', 'shy'],
        '🙉': ['hear', 'no', 'evil', 'monkey', 'deaf', 'ignore'],
        '🙊': ['speak', 'no', 'evil', 'monkey', 'quiet', 'secret'],
        
        // More Food & Drink
        '🥑': ['avocado', 'healthy', 'green', 'fruit', 'toast', 'millennial'],
        '🧄': ['garlic', 'cooking', 'ingredient', 'vampire', 'spice'],
        '🧅': ['onion', 'cooking', 'ingredient', 'cry', 'layers'],
        '🫐': ['blueberry', 'fruit', 'healthy', 'berry', 'antioxidant'],
        '🥭': ['mango', 'fruit', 'tropical', 'sweet', 'yellow'],
        '🫒': ['olive', 'oil', 'mediterranean', 'healthy', 'green'],
        '🥥': ['coconut', 'tropical', 'water', 'healthy', 'white'],
        '🧋': ['bubble', 'tea', 'boba', 'drink', 'asian', 'tapioca'],
        '🧃': ['juice', 'box', 'drink', 'kids', 'straw'],
        '🫖': ['teapot', 'tea', 'hot', 'drink', 'ceremony'],
        '🥤': ['cup', 'straw', 'soda', 'drink', 'takeaway'],
        '🧊': ['ice', 'cube', 'cold', 'frozen', 'drink'],
        
        // Technology & Objects (2025)
        '💻': ['laptop', 'computer', 'work', 'tech', 'coding', 'programming'],
        '📱': ['phone', 'mobile', 'smartphone', 'cell', 'iphone', 'android'],
        '⌚': ['watch', 'apple', 'time', 'smart', 'wearable'],
        '🖥️': ['desktop', 'computer', 'monitor', 'screen', 'pc'],
        '⌨️': ['keyboard', 'typing', 'computer', 'input'],
        '🖱️': ['mouse', 'computer', 'click', 'cursor'],
        '🖨️': ['printer', 'print', 'office', 'paper'],
        '📹': ['camera', 'video', 'recording', 'film'],
        '📷': ['camera', 'photo', 'picture', 'snapshot'],
        '🎧': ['headphones', 'music', 'audio', 'sound'],
        '🎮': ['game', 'controller', 'gaming', 'console', 'play'],
        '🕹️': ['joystick', 'arcade', 'game', 'retro'],
        '📺': ['tv', 'television', 'watch', 'screen'],
        '📻': ['radio', 'music', 'broadcast', 'fm'],
        '🔌': ['plug', 'electric', 'power', 'socket'],
        '🔋': ['battery', 'power', 'energy', 'charge'],
        '🪫': ['battery', 'low', 'empty', 'dead', 'power'],
        
        // More Symbols & Signs
        '⚡': ['lightning', 'bolt', 'electric', 'power', 'fast'],
        '⭐': ['star', 'favorite', 'special', 'bright', 'shine'],
        '🌟': ['star', 'glowing', 'sparkle', 'special', 'bright'],
        '💫': ['dizzy', 'stars', 'sparkle', 'magic', 'wonder'],
        '✨': ['sparkles', 'magic', 'special', 'shine', 'clean'],
        '⚽': ['soccer', 'football', 'ball', 'sport', 'world'],
        '🏀': ['basketball', 'ball', 'sport', 'orange', 'hoop'],
        '🏈': ['american', 'football', 'ball', 'sport', 'nfl'],
        '⚾': ['baseball', 'ball', 'sport', 'america', 'diamond'],
        '🎾': ['tennis', 'ball', 'sport', 'yellow', 'court'],
        '🏐': ['volleyball', 'ball', 'sport', 'beach', 'net'],
        '🏉': ['rugby', 'ball', 'sport', 'oval', 'tackle'],
        '🎱': ['pool', 'ball', 'eight', 'billiards', 'game'],
        '🏓': ['ping', 'pong', 'table', 'tennis', 'paddle'],
        '🏸': ['badminton', 'racket', 'shuttlecock', 'sport'],
        '🥅': ['goal', 'net', 'soccer', 'hockey', 'sport'],
        '⛳': ['golf', 'flag', 'hole', 'sport', 'green'],
        '🏆': ['trophy', 'award', 'winner', 'champion', 'first'],
        '🥇': ['gold', 'medal', 'first', 'winner', 'champion'],
        '🥈': ['silver', 'medal', 'second', 'runner', 'up'],
        '🥉': ['bronze', 'medal', 'third', 'place', 'award'],
        
        // More Weather & Nature
        '☀️': ['sun', 'sunny', 'bright', 'hot', 'summer'],
        '🌤️': ['partly', 'cloudy', 'sun', 'behind', 'cloud'],
        '⛅': ['partly', 'cloudy', 'sun', 'weather'],
        '☁️': ['cloud', 'cloudy', 'weather', 'overcast'],
        '🌦️': ['sun', 'behind', 'rain', 'cloud', 'weather'],
        '🌧️': ['rain', 'cloud', 'weather', 'storm'],
        '⛈️': ['thunder', 'cloud', 'rain', 'lightning', 'storm'],
        '🌩️': ['cloud', 'lightning', 'thunder', 'storm'],
        '❄️': ['snowflake', 'cold', 'winter', 'snow', 'frozen'],
        '☃️': ['snowman', 'winter', 'cold', 'snow', 'frozen'],
        '⛄': ['snowman', 'winter', 'cold', 'carrot', 'snow'],
        '🌪️': ['tornado', 'cyclone', 'twister', 'storm', 'spiral'],
        '🌈': ['rainbow', 'colorful', 'pride', 'weather', 'arc'],
        '💧': ['droplet', 'water', 'rain', 'tear', 'blue'],
        '🌊': ['wave', 'water', 'ocean', 'sea', 'surf'],
        
        // Transportation (2025)
        '✈️': ['airplane', 'flight', 'travel', 'plane', 'aviation'],
        '🚗': ['car', 'auto', 'vehicle', 'drive', 'transport'],
        '🚕': ['taxi', 'cab', 'yellow', 'ride', 'transport'],
        '🚙': ['suv', 'car', 'vehicle', 'recreational'],
        '🚌': ['bus', 'public', 'transport', 'school'],
        '🏎️': ['race', 'car', 'fast', 'speed', 'formula'],
        '🚓': ['police', 'car', 'cop', 'law', 'enforcement'],
        '🚑': ['ambulance', 'emergency', 'medical', 'hospital'],
        '🚒': ['fire', 'truck', 'emergency', 'rescue'],
        '🚐': ['van', 'minibus', 'transport', 'family'],
        '🛻': ['pickup', 'truck', 'vehicle', 'utility'],
        '🚚': ['truck', 'delivery', 'shipping', 'cargo'],
        '🚛': ['semi', 'truck', 'trailer', 'transport'],
        '🚜': ['tractor', 'farm', 'agriculture', 'farming'],
        '🏍️': ['motorcycle', 'bike', 'motor', 'speed'],
        '🛴': ['scooter', 'kick', 'transport', 'fun'],
        '🚲': ['bicycle', 'bike', 'cycle', 'eco', 'green'],
        '🛺': ['auto', 'rickshaw', 'tuk-tuk', 'transport'],
        '🚁': ['helicopter', 'chopper', 'flight', 'rotor'],
        '🚀': ['rocket', 'space', 'launch', 'nasa', 'moon'],
        '🛸': ['ufo', 'alien', 'space', 'flying', 'saucer'],
        '🚂': ['train', 'locomotive', 'steam', 'railway'],
        '🚄': ['bullet', 'train', 'fast', 'speed', 'japan'],
        '🚅': ['bullet', 'train', 'speed', 'fast', 'shinkansen'],
        '🚆': ['train', 'railway', 'transport', 'metro'],
        '🚇': ['metro', 'subway', 'underground', 'tube'],
        '🚈': ['light', 'rail', 'train', 'tram'],
        '🚉': ['station', 'train', 'railway', 'platform'],
        '🚊': ['tram', 'streetcar', 'trolley', 'public'],
        '🚢': ['ship', 'boat', 'cruise', 'ocean'],
        '⛴️': ['ferry', 'boat', 'ship', 'transport'],
        '🛥️': ['boat', 'motor', 'yacht', 'speed'],
        '🚤': ['speedboat', 'fast', 'boat', 'water'],
        '⛵': ['sailboat', 'sailing', 'wind', 'yacht'],
        '🚧': ['construction', 'work', 'warning', 'barrier'],
        '⛽': ['gas', 'station', 'fuel', 'petrol']
    }),

    /**
     * Enhanced emoji search with fuzzy matching and multiple strategies
     */
    searchEmojis: (query) => {
        if (!query || query.length < 1) return [];
        
        const searchDb = Utils.getEmojiSearchDatabase();
        const results = [];
        const lowerQuery = query.toLowerCase().trim();
        
        // Strategy 1: Exact and partial keyword matching
        Object.entries(searchDb).forEach(([emoji, keywords]) => {
            let score = 0;
            let matchedKeywords = [];
            
            keywords.forEach(keyword => {
                if (keyword === lowerQuery) {
                    score += 15; // Exact match
                    matchedKeywords.push(keyword);
                } else if (keyword.startsWith(lowerQuery)) {
                    score += 8; // Starts with
                    matchedKeywords.push(keyword);
                } else if (keyword.includes(lowerQuery)) {
                    score += 3; // Contains
                    matchedKeywords.push(keyword);
                }
            });
            
            // Strategy 2: Fuzzy matching for typos (simple)
            if (score === 0 && lowerQuery.length >= 3) {
                keywords.forEach(keyword => {
                    if (Utils.isFuzzyMatch(keyword, lowerQuery)) {
                        score += 1;
                        matchedKeywords.push(keyword + '*');
                    }
                });
            }
            
            if (score > 0) {
                results.push({ 
                    emoji, 
                    score, 
                    keywords: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 3)
                });
            }
        });
        
        // Sort by score (relevance) and return top 24 results
        return results
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                // Secondary sort by keyword length (shorter is more relevant)
                return a.keywords[0].length - b.keywords[0].length;
            })
            .slice(0, 24);
    },

    /**
     * Simple fuzzy matching for typos (Levenshtein distance approximation)
     */
    isFuzzyMatch: (word, query) => {
        if (Math.abs(word.length - query.length) > 2) return false;
        
        let matches = 0;
        const minLength = Math.min(word.length, query.length);
        
        for (let i = 0; i < minLength; i++) {
            if (word[i] === query[i]) matches++;
        }
        
        // Allow 1-2 character differences depending on length
        const threshold = query.length <= 4 ? query.length - 1 : query.length - 2;
        return matches >= threshold;
    }
};