useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    console.log("👤 Auth state changed:", currentUser);
    setUser(currentUser);

    if (currentUser) {
      try {
        const roleRef = ref(db, `attendance/users/${currentUser.uid}/role`);
        const snapshot = await get(roleRef);
        console.log("📥 Fetched role snapshot:", snapshot.val());
        if (snapshot.exists()) {
          setRole(snapshot.val());
        } else {
          console.log("⚠️ Role not found in DB for UID:", currentUser.uid);
          setRole(null);
        }
      } catch (err) {
        console.error("❌ Error fetching role:", err);
        setRole(null);
      }
    } else {
      console.log("🚫 No user logged in");
      setRole(null);
    }

    setCheckingAuth(false);
  });

  return () => unsubscribe();
}, []);
