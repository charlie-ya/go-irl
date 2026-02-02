export function abbreviateUsername(name: string): string {
    if (!name) return '';

    // Check for separators (space, underscore, hyphen)
    const separators = /[\s_\-]/;

    if (separators.test(name)) {
        const parts = name.split(separators).filter(part => part.length > 0);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]);
        }
    }

    // Default: first two characters
    return name.substring(0, 2);
}
