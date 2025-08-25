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
    }
};