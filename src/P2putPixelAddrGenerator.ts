 

import { bech32 } from "bech32";
 
const NUM_COLOURS = 16;

const VARINT_U16 = 253;
const VARINT_U32 = 254;

class Deserialiser {
    #dataView: DataView;
    #offset: number;

    constructor(bytes: ArrayBuffer) {
        this.#dataView = new DataView(bytes);
        this.#offset = 0;
    }

    uint8(): number {
        const i = this.#dataView.getUint8(this.#offset);
        this.#offset += 1;
        return i;
    }

    uint16(): number {
        const i = this.#dataView.getUint16(this.#offset);
        this.#offset += 2;
        return i;
    }

    uint32(): number {
        const i = this.#dataView.getUint32(this.#offset);
        this.#offset += 4;
        return i;
    }

    uint64(): bigint {
        const i = this.#dataView.getBigUint64(this.#offset);
        this.#offset += 8;
        return i;
    }

    varint(): bigint {
        const first = this.uint8();
        if (first < VARINT_U16) return BigInt(first);
        if (first == VARINT_U16) return BigInt(this.uint16());
        if (first == VARINT_U32) return BigInt(this.uint32());
        return this.uint64();
    }

}



  class PixelColour {
    coord: PixelCoord;
    colourId: number;

    constructor(coord: PixelCoord, colourId: number) {
        this.coord = coord;
        this.colourId = colourId;
        if (this.colourId >= NUM_COLOURS)
            throw RangeError("Colour ID is out of range 0-15");
    }

    static fromDeserialiser(ds: Deserialiser) {
        return new PixelColour({
            x: ds.uint16(),
            y: ds.uint16()
        }, ds.uint8());
    }

    get colour(): Colour {
        return Colour.fromId(this.colourId);
    }

}




export class Colour {
    id: number;
    name: string;
    rgb: number;

    static get palette() {
        // Return new list each time to avoid mutation.
        return [
            new Colour(0, 0xFFFFFF, "white"),
            new Colour(1, 0xC8C8C8, "light grey"),
            new Colour(2, 0x888888, "grey"),
            new Colour(3, 0x000000, "black"),
            new Colour(4, 0xFFA7D1, "pink"),
            new Colour(5, 0xE50000, "red"),
            new Colour(6, 0xF07010, "orange"),
            new Colour(7, 0x663311, "brown"),
            new Colour(8, 0xFFFF00, "yellow"),
            new Colour(9, 0x02D501, "bright green"),
            new Colour(10, 0x3cb054, "peercoin green"),
            new Colour(11, 0x006000, "dark green"),
            new Colour(12, 0x00D3DD, "cyan"),
            new Colour(13, 0x0083C7, "blue"),
            new Colour(14, 0x0000EA, "dark blue"),
            new Colour(15, 0x820080, "purple")
        ];
    }

    constructor(id: number, rgb: number, name: string) {
        this.id = id;
        this.name = name;
        this.rgb = rgb;
    }

    static fromId(id: number): Colour {
        return this.palette[id];
    }

    get cssStr(): string {
        return `#${this.rgb.toString(16).padStart(6, "0")}`;
    }

    get red(): number {
        return this.rgb >> 16;
    }

    get green(): number {
        return (this.rgb >> 8) & 0xff;
    }

    get blue(): number {
        return this.rgb & 0xff;
    }

}




const BURN_PATTERN: number[] = [0x7b, 0xde, 0xf7, 0xbd, 0xef];

export class P2putAddrGenerator {
    #bechPrefix: string;
    #bytes: Uint8Array;

    constructor(bechPrefix: string, burnPrefix: number[]) {

        if (burnPrefix.length != 5) throw Error("P2PUT prefixes must be 5 bytes");

        this.#bechPrefix = bechPrefix;

        // Add prefix to buffer
        this.#bytes = new Uint8Array(32);
        this.#bytes.set(new Uint8Array(burnPrefix), 0);

        // Add 15 burn bytes to buffer
        for (let i = 5; i <= 15; i += 5)
            this.#bytes.set(BURN_PATTERN, i);

    }

    withData(data: ArrayBufferLike): string {

        // Pad with burn pattern
        for (let i = 0; i < 12-data.byteLength; i++)
            this.#bytes[20+i] = BURN_PATTERN[i % 5];

        // Add data onto end
        this.#bytes.set(new Uint8Array(data), 32-data.byteLength);

        // Encode into bech32 address
        return bech32.encode(
            this.#bechPrefix, [0].concat(bech32.toWords(this.#bytes))
        );

    }

}



interface PixelCoord {
    x: number,
    y: number
}


interface PixelAddrGenerator {
    forPixelColour(coord: PixelCoord, colourId: number): string;
}


export class P2putPixelAddrGenerator implements PixelAddrGenerator {
    #addrGen: P2putAddrGenerator;

    constructor(bechPrefix: string, burnPrefix: number[]) {
        this.#addrGen = new P2putAddrGenerator(bechPrefix, burnPrefix);
    }

    forPixelColour(coord: PixelCoord, colourId: number): string {
        // Serialise coordinates into 5 byte app data for end of P2PUT address

        const buf = new ArrayBuffer(5);
        const dv = new DataView(buf);

        dv.setUint16(0, coord.x);
        dv.setUint16(2, coord.y);
        dv.setUint8(4, colourId);

        return this.#addrGen.withData(buf);

    }

}

