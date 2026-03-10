"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRelative = formatRelative;
exports.formatTimestamp = formatTimestamp;
exports.formatDuration = formatDuration;
exports.formatRelativeTimestamp = formatRelativeTimestamp;
function formatRelative(ms) {
    if (!Number.isFinite(ms))
        return "-";
    var diff = Date.now() - ms;
    if (diff < 1000)
        return "now";
    var seconds = Math.floor(diff / 1000);
    if (seconds < 60)
        return "".concat(seconds, "s");
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60)
        return "".concat(minutes, "m");
    var hours = Math.floor(minutes / 60);
    if (hours < 24)
        return "".concat(hours, "h");
    var days = Math.floor(hours / 24);
    return "".concat(days, "d");
}
function formatTimestamp(ms) {
    if (!Number.isFinite(ms))
        return "-";
    var date = new Date(ms);
    return date.toLocaleString();
}
function formatDuration(ms) {
    if (!Number.isFinite(ms))
        return "-";
    if (ms < 1000)
        return "".concat(ms, "ms");
    if (ms < 60000)
        return "".concat((ms / 1000).toFixed(1), "s");
    var minutes = ms / 60000;
    if (minutes < 60)
        return "".concat(minutes.toFixed(1), "m");
    var hours = minutes / 60;
    return "".concat(hours.toFixed(1), "h");
}
function toTimestampMs(input) {
    if (input instanceof Date)
        return input.getTime();
    if (typeof input === "string")
        return new Date(input).getTime();
    if (!Number.isFinite(input))
        return Number.NaN;
    // Treat numeric Unix timestamps as seconds when value looks like seconds.
    return Math.abs(input) < 1000000000000 ? input * 1000 : input;
}
function pluralize(value, unit) {
    return "".concat(value, " ").concat(unit).concat(value === 1 ? "" : "s", " ago");
}
function formatRelativeTimestamp(input) {
    var timestampMs = toTimestampMs(input);
    if (!Number.isFinite(timestampMs))
        return "-";
    var diffMs = Math.max(0, Date.now() - timestampMs);
    if (diffMs < 60000)
        return "just now";
    var minutes = Math.floor(diffMs / 60000);
    if (minutes < 60)
        return pluralize(minutes, "minute");
    var hours = Math.floor(diffMs / 3600000);
    if (hours < 24)
        return pluralize(hours, "hour");
    if (hours < 48)
        return "yesterday";
    return new Date(timestampMs).toLocaleDateString();
}
//# sourceMappingURL=format.js.map