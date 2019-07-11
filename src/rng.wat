;; fork from xoroshiro128starstar

(module
 (type $Fv (func (param f64)))
 (type $II (func (param i64) (result i64)))
 (type $F (func (result f64)))
 (type $Ti (func (result i32)))
 (type $Tiiiiv (func (param i32) (param i32) (param i32) (param i32)))
 (global $s0 (mut i64) (i64.const 0))
 (global $s1 (mut i64) (i64.const 0))
 (export "initState" (func $initState))
 (export "getStateLoLo" (func $getStateLoLo))
 (export "getStateLoHi" (func $getStateLoHi))
 (export "getStateHiLo" (func $getStateHiLo))
 (export "getStateHiHi" (func $getStateHiHi))
 (export "setState" (func $setState))
 (export "next" (func $next))
 (func $splitmix64 (; 0 ;) (; has Stack IR ;) (type $II) (param $0 i64) (result i64)
  (i64.xor
   (tee_local $0
    (i64.mul
     (i64.xor
      (tee_local $0
       (i64.mul
        (i64.xor
         (tee_local $0
          (i64.add
           (get_local $0)
           (i64.const -7046029254386353131)
          )
         )
         (i64.shr_u
          (get_local $0)
          (i64.const 30)
         )
        )
        (i64.const -4658895280553007687)
       )
      )
      (i64.shr_u
       (get_local $0)
       (i64.const 27)
      )
     )
     (i64.const -7723592293110705685)
    )
   )
   (i64.shr_u
    (get_local $0)
    (i64.const 31)
   )
  )
 )
 (func $initState (; 1 ;) (; has Stack IR ;) (type $Fv) (param $0 f64)
  (set_global $s0
   (call $splitmix64
    (i64.reinterpret/f64
     (get_local $0)
    )
   )
  )
  (set_global $s1
   (call $splitmix64
    (get_global $s0)
   )
  )
 )
 (func $getStateLoLo (; 3 ;) (; has Stack IR ;) (type $Ti) (result i32)
  (i32.wrap/i64 (get_global $s0))
 )
 (func $getStateLoHi (; 4 ;) (; has Stack IR ;) (type $Ti) (result i32)
  (i32.wrap/i64 (i64.shr_u (get_global $s0) (i64.const 32)))
 )
 (func $getStateHiLo (; 5 ;) (; has Stack IR ;) (type $Ti) (result i32)
  (i32.wrap/i64 (get_global $s1))
 )
 (func $getStateHiHi (; 6 ;) (; has Stack IR ;) (type $Ti) (result i32)
  (i32.wrap/i64 (i64.shr_u (get_global $s1) (i64.const 32)))
 )
 (func $setState (; 7 ;) (; has Stack IR ;) (type $Tiiiiv) (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (set_global $s0 (i64.or (i64.extend_u/i32 (get_local $0)) (i64.shl (i64.extend_u/i32 (get_local $1)) (i64.const 32))))
  (set_global $s1 (i64.or (i64.extend_u/i32 (get_local $2)) (i64.shl (i64.extend_u/i32 (get_local $3)) (i64.const 32))))
 )
 (func $next (; 2 ;) (; has Stack IR ;) (type $F) (result f64)
  (local $0 i64)
  (set_local $0
   (i64.mul
    (i64.rotl
     (i64.mul
      (get_global $s0)
      (i64.const 5)
     )
     (i64.const 7)
    )
    (i64.const 9)
   )
  )
  (set_global $s1
   (i64.xor
    (get_global $s1)
    (get_global $s0)
   )
  )
  (set_global $s0
   (i64.xor
    (i64.xor
     (i64.rotl
      (get_global $s0)
      (i64.const 24)
     )
     (get_global $s1)
    )
    (i64.shl
     (get_global $s1)
     (i64.const 16)
    )
   )
  )
  (set_global $s1
   (i64.rotl
    (get_global $s1)
    (i64.const 37)
   )
  )
  (f64.mul
   (f64.convert_u/i64
    (i64.shr_u
     (get_local $0)
     (i64.const 11)
    )
   )
   (f64.const 1.1102230246251565e-16)
  )
 )
)
