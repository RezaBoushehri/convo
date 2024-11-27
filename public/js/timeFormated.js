/**
 * Formats a timestamp based on the given rules:
 * - Same day: HH:mm
 * - Within a week: X days ago at HH:mm
 * - More than a week: 1 week, 2 weeks, etc.
 * - Over a year: Y/M/D (fa-IR locale)
 * @param {Date} timestamp - The timestamp to format.
 * @returns {string} - Formatted timestamp.
 */function formatTimestamp(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const timeDiff = now - messageTime;
    const oneSecond = 1000; // Milliseconds in a second
    const oneMinute = 60 * oneSecond; // Milliseconds in a minute
    const oneDay = 24 * 60 * 60 * 1000; // Milliseconds in a day
    const oneWeek = 7 * oneDay; // Milliseconds in a week

    if (timeDiff < oneMinute) {
        // Less than a minute, show seconds
        const secondsAgo = Math.floor(timeDiff / oneSecond);
        return `${secondsAgo} second${secondsAgo > 1 ? "s" : ""} ago`;
    } else if (timeDiff < oneDay) {
        // Same day
        return messageTime.toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } else if (timeDiff < oneWeek) {
        // Within a week
        const daysAgo = Math.floor(timeDiff / oneDay);
        return `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago at ${messageTime.toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    } else if (timeDiff < 365 * oneDay) {
        // Within a year
        const weeksAgo = Math.floor(timeDiff / oneWeek);
        return `${weeksAgo} week${weeksAgo > 1 ? "s" : ""}`;
    } else {
        // Over a year
        return messageTime.toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    }
}
