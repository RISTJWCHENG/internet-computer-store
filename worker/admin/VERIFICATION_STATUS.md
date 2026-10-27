# Administrator authentication verification status

Production administrator writes must remain disabled. The standalone signature
verifier currently pinned by this project predates current IC certificate
formats and certificate delegation policy. The historical canister signature
test only verifies the root-key format and a known cryptographic signature; it
does not establish compatibility or compliance with current IC certificates.
Before enabling writes, use a current verifier, test current mainnet canister
signatures and certificate policies, and verify a real administrator login.
