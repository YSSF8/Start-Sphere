class Encryption {
    static codePoints = [];
    static codePointToIndex = new Map();

    static initialize() {
        const ranges = [
            [0x0600, 0x06FF],
            [0x0750, 0x077F],
            [0x08A0, 0x08FF],
            [0xFB50, 0xFDFF],
            [0xFE70, 0xFEFF],
            [0x3040, 0x309F],
            [0x30A0, 0x30FF],
            [0xAC00, 0xD7A3],
            [0x4E00, 0x9FFF],
            [0x2600, 0x26FF],
            [0x2700, 0x27BF],
            [0x0020, 0x002F],
            [0x003A, 0x0040],
            [0x005B, 0x0060],
            [0x007B, 0x007E],
        ];
        for (const [start, end] of ranges) {
            for (let codePoint = start; codePoint <= end; codePoint++) {
                if (
                    (codePoint >= 0x0041 && codePoint <= 0x005A) ||
                    (codePoint >= 0x0061 && codePoint <= 0x007A)
                ) {
                    continue;
                }
                Encryption.codePoints.push(codePoint);
                Encryption.codePointToIndex.set(codePoint, Encryption.codePoints.length - 1);
            }
        }
    }

    static hashCode(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return Math.abs(hash);
    }

    static encrypt(encryptionKey, value) {
        if (Encryption.codePoints.length === 0) Encryption.initialize();

        const seed = Encryption.hashCode(encryptionKey);
        const prng = new PRNG(seed);
        const encryptedChars = [];

        for (let i = 0; i < value.length;) {
            const codePoint = value.codePointAt(i);
            const charLength = codePoint > 0xFFFF ? 2 : 1;
            const prngValue = prng.nextInt(Encryption.codePoints.length);
            const encryptedCodeIndex = (codePoint + prngValue) % Encryption.codePoints.length;
            const encryptedCodePoint = Encryption.codePoints[encryptedCodeIndex];
            encryptedChars.push(String.fromCodePoint(encryptedCodePoint));
            i += charLength;
        }

        return encryptedChars.join('');
    }

    static decrypt(encryptionKey, value) {
        if (Encryption.codePoints.length === 0) Encryption.initialize();

        const seed = Encryption.hashCode(encryptionKey);
        const prng = new PRNG(seed);
        const decryptedChars = [];

        for (let i = 0; i < value.length;) {
            const encryptedCodePoint = value.codePointAt(i);
            const charLength = encryptedCodePoint > 0xFFFF ? 2 : 1;
            const encryptedCodeIndex = Encryption.codePointToIndex.get(encryptedCodePoint);
            if (encryptedCodeIndex === undefined) {
                throw new Error('Invalid character in encrypted string.');
            }
            const prngValue = prng.nextInt(Encryption.codePoints.length);
            const originalCodePoint = (encryptedCodeIndex - prngValue + Encryption.codePoints.length) % Encryption.codePoints.length;
            decryptedChars.push(String.fromCodePoint(originalCodePoint));
            i += charLength;
        }

        return decryptedChars.join('');
    }
}

class PRNG {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        return this.seed = (this.seed * 16807) % 2147483647;
    }

    nextInt(max) {
        return this.next() % max;
    }
}