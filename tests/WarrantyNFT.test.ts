import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";
import { Buffer } from "buffer";

const ERR_NOT_AUTHORIZED = 100;
// @ts-ignore
const ERR_INVALID_EXPIRATION = 101;
const ERR_INVALID_SERIAL = 102;
const ERR_INVALID_MANUFACTURER = 103;
const ERR_INVALID_PRODUCT_TYPE = 104;
// @ts-ignore
const ERR_INVALID_OWNER = 105;
const ERR_TOKEN_ALREADY_EXISTS = 106;
// @ts-ignore
const ERR_TOKEN_NOT_FOUND = 107;
// @ts-ignore
const ERR_INVALID_TIMESTAMP = 108;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
// @ts-ignore
const ERR_INVALID_EXTENSION_DUR = 110;
const ERR_INVALID_MAX_EXTENSIONS = 111;
// @ts-ignore
const ERR_TOKEN_UPDATE_NOT_ALLOWED = 112;
// @ts-ignore
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_TOKENS_EXCEEDED = 114;
// @ts-ignore
const ERR_INVALID_STATUS = 115;
const ERR_INVALID_WARRANTY_VALUE = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_PROOF_HASH = 120;

interface Token {
  serial: string;
  expiration: number;
  manufacturer: string;
  productType: string;
  owner: string;
  timestamp: number;
  minter: string;
  status: boolean;
  extensionCount: number;
  maxExtensions: number;
  warrantyValue: number;
  gracePeriod: number;
  location: string;
  currency: string;
  proofHash: Buffer;
}

interface TokenUpdate {
  updateExpiration: number;
  updateProductType: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class WarrantyNFTMock {
  state: {
    nextTokenId: number;
    maxTokens: number;
    mintFee: number;
    authorityContract: string | null;
    tokens: Map<number, Token>;
    tokenUpdates: Map<number, TokenUpdate>;
    tokensBySerial: Map<string, number>;
  } = {
    nextTokenId: 0,
    maxTokens: 100000,
    mintFee: 500,
    authorityContract: null,
    tokens: new Map(),
    tokenUpdates: new Map(),
    tokensBySerial: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextTokenId: 0,
      maxTokens: 100000,
      mintFee: 500,
      authorityContract: null,
      tokens: new Map(),
      tokenUpdates: new Map(),
      tokensBySerial: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMintFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newFee < 0) return { ok: false, value: false };
    this.state.mintFee = newFee;
    return { ok: true, value: true };
  }

  setMaxTokens(newMax: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newMax <= 0) return { ok: false, value: false };
    this.state.maxTokens = newMax;
    return { ok: true, value: true };
  }

  mintWarranty(
    serial: string,
    expiration: number,
    manufacturer: string,
    productType: string,
    owner: string,
    maxExtensions: number,
    warrantyValue: number,
    gracePeriod: number,
    location: string,
    currency: string,
    proofHash: Buffer
  ): Result<number> {
    if (this.state.nextTokenId >= this.state.maxTokens) return { ok: false, value: ERR_MAX_TOKENS_EXCEEDED };
    if (!serial || serial.length > 50) return { ok: false, value: ERR_INVALID_SERIAL };
    if (expiration <= this.blockHeight) return { ok: false, value: ERR_INVALID_EXPIRATION };
    if (manufacturer === this.caller) return { ok: false, value: ERR_INVALID_MANUFACTURER };
    if (!["electronics", "appliances", "vehicles"].includes(productType)) return { ok: false, value: ERR_INVALID_PRODUCT_TYPE };
    if (maxExtensions > 10) return { ok: false, value: ERR_INVALID_MAX_EXTENSIONS };
    if (warrantyValue <= 0) return { ok: false, value: ERR_INVALID_WARRANTY_VALUE };
    if (gracePeriod > 90) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (proofHash.length !== 32) return { ok: false, value: ERR_INVALID_PROOF_HASH };
    if (this.state.tokensBySerial.has(serial)) return { ok: false, value: ERR_TOKEN_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.mintFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextTokenId;
    const token: Token = {
      serial,
      expiration,
      manufacturer,
      productType,
      owner,
      timestamp: this.blockHeight,
      minter: this.caller,
      status: true,
      extensionCount: 0,
      maxExtensions,
      warrantyValue,
      gracePeriod,
      location,
      currency,
      proofHash,
    };
    this.state.tokens.set(id, token);
    this.state.tokensBySerial.set(serial, id);
    this.state.nextTokenId++;
    return { ok: true, value: id };
  }

  getToken(id: number): Token | null {
    return this.state.tokens.get(id) || null;
  }

  transferWarranty(id: number, newOwner: string): Result<boolean> {
    const token = this.state.tokens.get(id);
    if (!token) return { ok: false, value: false };
    if (token.owner !== this.caller) return { ok: false, value: false };
    const updated: Token = {
      ...token,
      owner: newOwner,
      timestamp: this.blockHeight,
    };
    this.state.tokens.set(id, updated);
    return { ok: true, value: true };
  }

  extendWarranty(id: number, extensionDur: number): Result<boolean> {
    const token = this.state.tokens.get(id);
    if (!token) return { ok: false, value: false };
    if (this.caller !== this.state.authorityContract) return { ok: false, value: false };
    if (extensionDur <= 0) return { ok: false, value: false };
    if (token.extensionCount >= token.maxExtensions) return { ok: false, value: false };
    const newExp = token.expiration + extensionDur;
    if (newExp <= this.blockHeight) return { ok: false, value: false };
    const updated: Token = {
      ...token,
      expiration: newExp,
      extensionCount: token.extensionCount + 1,
      timestamp: this.blockHeight,
    };
    this.state.tokens.set(id, updated);
    return { ok: true, value: true };
  }

  updateWarranty(id: number, updateExpiration: number, updateProductType: string): Result<boolean> {
    const token = this.state.tokens.get(id);
    if (!token) return { ok: false, value: false };
    if (token.minter !== this.caller) return { ok: false, value: false };
    if (updateExpiration <= this.blockHeight) return { ok: false, value: false };
    if (!["electronics", "appliances", "vehicles"].includes(updateProductType)) return { ok: false, value: ERR_INVALID_PRODUCT_TYPE };
    const updated: Token = {
      ...token,
      expiration: updateExpiration,
      productType: updateProductType,
      timestamp: this.blockHeight,
    };
    this.state.tokens.set(id, updated);
    this.state.tokenUpdates.set(id, {
      updateExpiration,
      updateProductType,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getTokenCount(): Result<number> {
    return { ok: true, value: this.state.nextTokenId };
  }

  checkTokenExistence(serial: string): Result<boolean> {
    return { ok: true, value: this.state.tokensBySerial.has(serial) };
  }
}

describe("WarrantyNFT", () => {
  let contract: WarrantyNFTMock;

  beforeEach(() => {
    contract = new WarrantyNFTMock();
    contract.reset();
  });

  it("mints a warranty successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    const result = contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const token = contract.getToken(0);
    expect(token?.serial).toBe("SERIAL123");
    expect(token?.expiration).toBe(100);
    expect(token?.manufacturer).toBe("ST3MANU");
    expect(token?.productType).toBe("electronics");
    expect(token?.owner).toBe("ST4OWNER");
    expect(token?.maxExtensions).toBe(5);
    expect(token?.warrantyValue).toBe(1000);
    expect(token?.gracePeriod).toBe(30);
    expect(token?.location).toBe("FactoryA");
    expect(token?.currency).toBe("STX");
    expect(token?.proofHash).toEqual(proofHash);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate serial", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    const result = contract.mintWarranty(
      "SERIAL123",
      200,
      "ST5MANU",
      "appliances",
      "ST6OWNER",
      3,
      2000,
      60,
      "FactoryB",
      "USD",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_TOKEN_ALREADY_EXISTS);
  });

  it("rejects mint without authority contract", () => {
    const proofHash = Buffer.alloc(32);
    const result = contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid expiration", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    const result = contract.mintWarranty(
      "SERIAL123",
      0,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EXPIRATION);
  });

  it("rejects invalid product type", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    const result = contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "invalid",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PRODUCT_TYPE);
  });

  it("transfers warranty successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST4OWNER";
    const result = contract.transferWarranty(0, "ST5NEWOWNER");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const token = contract.getToken(0);
    expect(token?.owner).toBe("ST5NEWOWNER");
  });

  it("rejects transfer by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST6FAKE";
    const result = contract.transferWarranty(0, "ST5NEWOWNER");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("extends warranty successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST2TEST";
    const result = contract.extendWarranty(0, 50);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const token = contract.getToken(0);
    expect(token?.expiration).toBe(150);
    expect(token?.extensionCount).toBe(1);
  });

  it("rejects extension by non-authority", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST6FAKE";
    const result = contract.extendWarranty(0, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects extension beyond max", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      1,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST2TEST";
    contract.extendWarranty(0, 50);
    const result = contract.extendWarranty(0, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("updates warranty successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    const result = contract.updateWarranty(0, 200, "appliances");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const token = contract.getToken(0);
    expect(token?.expiration).toBe(200);
    expect(token?.productType).toBe("appliances");
    const update = contract.state.tokenUpdates.get(0);
    expect(update?.updateExpiration).toBe(200);
    expect(update?.updateProductType).toBe("appliances");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update by non-minter", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.caller = "ST6FAKE";
    const result = contract.updateWarranty(0, 200, "appliances");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets mint fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setMintFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.mintFee).toBe(1000);
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("returns correct token count", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    contract.mintWarranty(
      "SERIAL456",
      200,
      "ST5MANU",
      "appliances",
      "ST6OWNER",
      3,
      2000,
      60,
      "FactoryB",
      "USD",
      proofHash
    );
    const result = contract.getTokenCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks token existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    const result = contract.checkTokenExistence("SERIAL123");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkTokenExistence("NONEXISTENT");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects mint with empty serial", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = Buffer.alloc(32);
    const result = contract.mintWarranty(
      "",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_SERIAL);
  });

  it("rejects mint with max tokens exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxTokens = 1;
    const proofHash = Buffer.alloc(32);
    contract.mintWarranty(
      "SERIAL123",
      100,
      "ST3MANU",
      "electronics",
      "ST4OWNER",
      5,
      1000,
      30,
      "FactoryA",
      "STX",
      proofHash
    );
    const result = contract.mintWarranty(
      "SERIAL456",
      200,
      "ST5MANU",
      "appliances",
      "ST6OWNER",
      3,
      2000,
      60,
      "FactoryB",
      "USD",
      proofHash
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_TOKENS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("parses warranty parameters with Clarity types", () => {
    const serial = stringUtf8CV("SERIAL123");
    const expiration = uintCV(100);
    expect(serial.value).toBe("SERIAL123");
    expect(expiration.value).toEqual(BigInt(100));
  });
});