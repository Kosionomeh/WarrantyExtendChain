(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-EXPIRATION u101)
(define-constant ERR-INVALID-SERIAL u102)
(define-constant ERR-INVALID-MANUFACTURER u103)
(define-constant ERR-INVALID-PRODUCT-TYPE u104)
(define-constant ERR-INVALID-OWNER u105)
(define-constant ERR-TOKEN-ALREADY-EXISTS u106)
(define-constant ERR-TOKEN-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-EXTENSION-DUR u110)
(define-constant ERR-INVALID-MAX-EXTENSIONS u111)
(define-constant ERR-TOKEN-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-TOKENS-EXCEEDED u114)
(define-constant ERR-INVALID-STATUS u115)
(define-constant ERR-INVALID-WARRANTY-VALUE u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-PROOF-HASH u120)

(define-data-var next-token-id uint u0)
(define-data-var max-tokens uint u100000)
(define-data-var mint-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map tokens
  uint
  {
    serial: (string-utf8 50),
    expiration: uint,
    manufacturer: principal,
    product-type: (string-utf8 50),
    owner: principal,
    timestamp: uint,
    minter: principal,
    status: bool,
    extension-count: uint,
    max-extensions: uint,
    warranty-value: uint,
    grace-period: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20),
    proof-hash: (buff 32)
  }
)

(define-map tokens-by-serial
  (string-utf8 50)
  uint)

(define-map token-updates
  uint
  {
    update-expiration: uint,
    update-product-type: (string-utf8 50),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-token (id uint))
  (map-get? tokens id)
)

(define-read-only (get-token-updates (id uint))
  (map-get? token-updates id)
)

(define-read-only (is-token-registered (serial (string-utf8 50)))
  (is-some (map-get? tokens-by-serial serial))
)

(define-private (validate-serial (serial (string-utf8 50)))
  (if (and (> (len serial) u0) (<= (len serial) u50))
      (ok true)
      (err ERR-INVALID-SERIAL))
)

(define-private (validate-expiration (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRATION))
)

(define-private (validate-manufacturer (man principal))
  (if (not (is-eq man tx-sender))
      (ok true)
      (err ERR-INVALID-MANUFACTURER))
)

(define-private (validate-product-type (ptype (string-utf8 50)))
  (if (or (is-eq ptype "electronics") (is-eq ptype "appliances") (is-eq ptype "vehicles"))
      (ok true)
      (err ERR-INVALID-PRODUCT-TYPE))
)

(define-private (validate-owner (own principal))
  (if (is-principal own)
      (ok true)
      (err ERR-INVALID-OWNER))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-extension-dur (dur uint))
  (if (> dur u0)
      (ok true)
      (err ERR-INVALID-EXTENSION-DUR))
)

(define-private (validate-max-extensions (max uint))
  (if (<= max u10)
      (ok true)
      (err ERR-INVALID-MAX-EXTENSIONS))
)

(define-private (validate-warranty-value (val uint))
  (if (> val u0)
      (ok true)
      (err ERR-INVALID-WARRANTY-VALUE))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u90)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-proof-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-PROOF-HASH))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-tokens (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-tokens new-max)
    (ok true)
  )
)

(define-public (set-mint-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set mint-fee new-fee)
    (ok true)
  )
)

(define-public (mint-warranty
  (serial (string-utf8 50))
  (expiration uint)
  (manufacturer principal)
  (product-type (string-utf8 50))
  (owner principal)
  (max-extensions uint)
  (warranty-value uint)
  (grace-period uint)
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (proof-hash (buff 32))
)
  (let (
        (next-id (var-get next-token-id))
        (current-max (var-get max-tokens))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-TOKENS-EXCEEDED))
    (try! (validate-serial serial))
    (try! (validate-expiration expiration))
    (try! (validate-manufacturer manufacturer))
    (try! (validate-product-type product-type))
    (try! (validate-owner owner))
    (try! (validate-max-extensions max-extensions))
    (try! (validate-warranty-value warranty-value))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-proof-hash proof-hash))
    (asserts! (is-none (map-get? tokens-by-serial serial)) (err ERR-TOKEN-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get mint-fee) tx-sender authority-recipient))
    )
    (map-set tokens next-id
      {
        serial: serial,
        expiration: expiration,
        manufacturer: manufacturer,
        product-type: product-type,
        owner: owner,
        timestamp: block-height,
        minter: tx-sender,
        status: true,
        extension-count: u0,
        max-extensions: max-extensions,
        warranty-value: warranty-value,
        grace-period: grace-period,
        location: location,
        currency: currency,
        proof-hash: proof-hash
      }
    )
    (map-set tokens-by-serial serial next-id)
    (var-set next-token-id (+ next-id u1))
    (print { event: "warranty-minted", id: next-id })
    (ok next-id)
  )
)

(define-public (transfer-warranty (token-id uint) (new-owner principal))
  (let ((token (map-get? tokens token-id)))
    (match token
      t
        (begin
          (asserts! (is-eq (get owner t) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-owner new-owner))
          (map-set tokens token-id
            (merge t { owner: new-owner, timestamp: block-height })
          )
          (print { event: "warranty-transferred", id: token-id, new-owner: new-owner })
          (ok true)
        )
      (err ERR-TOKEN-NOT-FOUND)
    )
  )
)

(define-public (extend-warranty (token-id uint) (extension-dur uint))
  (let ((token (map-get? tokens token-id)))
    (match token
      t
        (begin
          (asserts! (is-eq tx-sender (unwrap-panic (var-get authority-contract))) (err ERR-NOT-AUTHORIZED))
          (try! (validate-extension-dur extension-dur))
          (asserts! (< (get extension-count t) (get max-extensions t)) (err ERR-INVALID-MAX-EXTENSIONS))
          (let ((new-exp (+ (get expiration t) extension-dur)))
            (try! (validate-expiration new-exp))
            (map-set tokens token-id
              (merge t {
                expiration: new-exp,
                extension-count: (+ (get extension-count t) u1),
                timestamp: block-height
              })
            )
          )
          (print { event: "warranty-extended", id: token-id, duration: extension-dur })
          (ok true)
        )
      (err ERR-TOKEN-NOT-FOUND)
    )
  )
)

(define-public (update-warranty
  (token-id uint)
  (update-expiration uint)
  (update-product-type (string-utf8 50))
)
  (let ((token (map-get? tokens token-id)))
    (match token
      t
        (begin
          (asserts! (is-eq (get minter t) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-expiration update-expiration))
          (try! (validate-product-type update-product-type))
          (map-set tokens token-id
            (merge t {
              expiration: update-expiration,
              product-type: update-product-type,
              timestamp: block-height
            })
          )
          (map-set token-updates token-id
            {
              update-expiration: update-expiration,
              update-product-type: update-product-type,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "warranty-updated", id: token-id })
          (ok true)
        )
      (err ERR-TOKEN-NOT-FOUND)
    )
  )
)

(define-public (get-token-count)
  (ok (var-get next-token-id))
)

(define-public (check-token-existence (serial (string-utf8 50)))
  (ok (is-token-registered serial))
)