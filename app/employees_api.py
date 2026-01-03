# EMPLOYEES API ENDPOINTS - DA INTEGRARE IN server.py

# ==================== EMPLOYEES CRUD ====================

@api_router.get("/employees")
async def get_employees(username: str = Depends(get_current_user)):
    """Get all employees"""
    try:
        employees = await db.employees.find({"user_id": username}, {"_id": 0}).to_list(1000)
        return {"employees": employees, "total": len(employees)}
    except Exception as e:
        logger.error(f"❌ Errore get employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/employees/{employee_id}")
async def get_employee(employee_id: str, username: str = Depends(get_current_user)):
    """Get single employee"""
    try:
        employee = await db.employees.find_one({"id": employee_id, "user_id": username}, {"_id": 0})
        if not employee:
            raise HTTPException(status_code=404, detail="Dipendente non trovato")
        return employee
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore get employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/employees")
async def create_employee(employee: Employee, username: str = Depends(get_current_user)):
    """Create new employee"""
    try:
        employee.user_id = username
        employee_dict = employee.model_dump()
        employee_dict['created_at'] = employee_dict['created_at'].isoformat()
        employee_dict['updated_at'] = employee_dict['updated_at'].isoformat()
        
        await db.employees.insert_one(employee_dict)
        
        # Salva nel dizionario
        await save_employee_to_dictionary(
            codice_fiscale=employee.codice_fiscale,
            employee_data=employee_dict,
            username=username
        )
        
        logger.info(f"✅ Creato dipendente: {employee.nome} {employee.cognome}")
        
        return {"success": True, "message": "Dipendente creato con successo", "employee": employee_dict}
        
    except Exception as e:
        logger.error(f"❌ Errore create employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/employees/{employee_id}")
async def update_employee(employee_id: str, employee: Employee, username: str = Depends(get_current_user)):
    """Update employee"""
    try:
        employee.updated_at = datetime.now(timezone.utc)
        employee_dict = employee.model_dump()
        employee_dict['updated_at'] = employee_dict['updated_at'].isoformat()
        employee_dict['created_at'] = employee_dict['created_at'].isoformat()
        
        result = await db.employees.update_one(
            {"id": employee_id, "user_id": username},
            {"$set": employee_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Dipendente non trovato")
        
        # Aggiorna dizionario
        await save_employee_to_dictionary(
            codice_fiscale=employee.codice_fiscale,
            employee_data=employee_dict,
            username=username
        )
        
        logger.info(f"✅ Aggiornato dipendente: {employee.nome} {employee.cognome}")
        
        return {"success": True, "message": "Dipendente aggiornato con successo"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore update employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, username: str = Depends(get_current_user)):
    """Delete employee"""
    try:
        # Prima salva nel dizionario
        employee = await db.employees.find_one({"id": employee_id, "user_id": username})
        if employee:
            await save_employee_to_dictionary(
                codice_fiscale=employee['codice_fiscale'],
                employee_data=employee,
                username=username
            )
        
        result = await db.employees.delete_one({"id": employee_id, "user_id": username})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Dipendente non trovato")
        
        logger.info(f"🗑️ Eliminato dipendente: {employee_id}")
        
        return {"success": True, "message": "Dipendente eliminato (salvato nel dizionario)"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore delete employee: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== EMPLOYEES IMPORT ====================

@api_router.post("/employees/import-from-excel")
async def import_employees_from_excel(username: str = Depends(get_current_user)):
    """Import employees from uploaded Excel data"""
    try:
        # Dati dal file Excel fornito
        employees_data = [
            {"nome": "Alessandro", "cognome": "Capezzuto", "codice_fiscale": "CPZLSN86D02F839I", "data_nascita": "1986-04-02", "mansione": "Barista", "iban": "IT44D3608105138282568082570", "telefono": "3281417775", "email": "Alexcapezzuto@hotmail.it", "indirizzo": "Via Nerva, 50, 80126 Napoli NA, Italia"},
            {"nome": "Antonella", "cognome": "Carotenuto", "codice_fiscale": "CRTNNL96P52F839M", "data_nascita": "1996-09-12", "mansione": "Banconiera Pasticceria", "iban": "IT31C3608105138298913798918", "telefono": "3383804402", "email": "NINACAROTENUTO@GMAIL.COM", "indirizzo": "Via Campegna, 133, Napoli, NA, Italia"},
            {"nome": "Antonietta", "cognome": "Ceraldi", "codice_fiscale": "CRLNNT75M55F352C", "data_nascita": "1975-08-15", "mansione": "Cassiera", "telefono": "+393335446222", "indirizzo": "Piazza Nazionale, 46, Napoli, NA, Italia"},
            {"nome": "Valerio", "cognome": "Ceraldi", "codice_fiscale": "CRLVLR88H14F839O", "data_nascita": "1988-06-14", "mansione": "Resp.Amministrativo", "qualifica": "Amministrazione", "iban": "IT54M0100503400000000052380", "telefono": "3284388404", "email": "valerio.ceraldi@gmail.com", "indirizzo": "Via Battistello Caracciolo, Napoli NA, Italia"},
            {"nome": "Vincenzo", "cognome": "Ceraldi", "codice_fiscale": "CRLVCN74L15F839W", "data_nascita": "1974-07-15", "mansione": "Resp. Amministrativo", "qualifica": "Amministrazione", "iban": "IT10C0503403406000000005459", "telefono": "3937415426", "email": "vincenzoceraldi@gmail.com", "indirizzo": "Via P. Casilli, 37, 80026 Casoria NA, Italia"},
            {"nome": "Giuliano", "cognome": "Guarino", "codice_fiscale": "GRNGLN92L06F839J", "data_nascita": "1992-07-06", "mansione": "aiuto cameriere di ristorante", "qualifica": "cameriere", "iban": "IT62Q0306903487100000006597", "telefono": "+393668747962", "email": "Giulianoguarino92@icloud.com", "indirizzo": "Via Consalvo, 76, Napoli NA, Italia"},
            {"nome": "Angela", "cognome": "Lesina", "codice_fiscale": "LSNNGL96H58F839P", "data_nascita": "1996-06-18", "mansione": "Camerieri di ristorante", "qualifica": "cameriere", "iban": "IT39G0538703410000004107224", "telefono": "+393791234632", "email": "angela.lesina@hotmail.it", "indirizzo": "Strada Vicinale Quattrocalli, 109, Napoli, NA, Italia", "matricola": "0300025"},
            {"nome": "Marina", "cognome": "Liuzza", "codice_fiscale": "LZZMRN75L47F839Y", "mansione": "Banconiera Pasticceria", "email": "franciecamilla@gmail.com", "indirizzo": "Via Pietro Casilli, Casoria, NA, Italia"},
            {"nome": "Emanuele", "cognome": "Moscato", "codice_fiscale": "MSCMNL88R26F839C", "data_nascita": "1988-10-26", "mansione": "Aiuto Barista", "telefono": "3295446254", "email": "Emanuelemoscato1@gmail.com", "indirizzo": "Via Emanuele de Deo, Napoli NA, Italia"},
            {"nome": "Mario", "cognome": "Murolo", "codice_fiscale": "MRLMRA04M20F839D", "data_nascita": "2004-08-20", "mansione": "TIROCINANTE", "qualifica": "cameriere", "iban": "IT94K0503403406000000005978", "telefono": "+393757745783", "email": "MARIOMUROLO77@GMAIL.COM", "indirizzo": "Viale delle Metamorfosi, 340, Napoli, NA, Italia"},
            {"nome": "Antonio", "cognome": "Parisi", "codice_fiscale": "PRSNTN80R12F839X", "data_nascita": "1980-10-12", "mansione": "Barista", "iban": "IT69P0503439980000000008672", "telefono": "3317466923", "email": "Antonioparisi616@gmail.com", "indirizzo": "Via Salvatore di Giacomo, 80017 Melito di Napoli NA, Italia"},
            {"nome": "Salvatore", "cognome": "Pocci", "codice_fiscale": "PCCSVT69P30F839G", "data_nascita": "1969-09-30", "mansione": "PASTICCIERE", "iban": "IT20B0503439840000000008950", "telefono": "+393461365154", "email": "poccisalvatore@libero.it", "indirizzo": "Calata Capodichino, Napoli, NA, Italia"},
            {"nome": "Carmine", "cognome": "Russo", "codice_fiscale": "RSSCMN96M02F839N", "data_nascita": "1996-08-02", "mansione": "aiuto cameriere", "qualifica": "cameriere", "iban": "IT16I0329601601000067656035", "telefono": "+393319205158", "email": "carminerusso2896@gmail.com", "indirizzo": "Napoli"},
            {"nome": "Jananie Ayachana", "cognome": "Sankapala", "codice_fiscale": "SNKJNY74H48Z209K", "mansione": "Cameriera"},
            {"nome": "Luigi", "cognome": "Taiano", "codice_fiscale": "TNALGU95L10F839Y", "data_nascita": "1995-07-10", "mansione": "Cameriere", "qualifica": "cameriere", "iban": "IT34M0100503405000000006027", "telefono": "3333871233", "email": "luigitaiano1995@hotmail.com", "indirizzo": "Gradini Rosario a Portamedina, 14, 80134 Napoli NA, Italia"},
            {"nome": "Vincenzo", "cognome": "Vespa", "codice_fiscale": "VSPVCN67T26F839P", "data_nascita": "1967-12-26", "mansione": "Barista", "iban": "IT49X3608105138202090502096", "telefono": "3348303249", "email": "Enzovespa67@outlook.it", "indirizzo": "Salita Pontenuovo, 39, 80139 Napoli NA, Italia"}
        ]
        
        created_count = 0
        updated_count = 0
        
        for emp_data in employees_data:
            try:
                cf = emp_data['codice_fiscale']
                
                # Verifica se esiste già
                existing = await db.employees.find_one({"codice_fiscale": cf, "user_id": username})
                
                employee_doc = {
                    "id": existing['id'] if existing else str(uuid.uuid4()),
                    "user_id": username,
                    "nome": emp_data.get('nome', ''),
                    "cognome": emp_data.get('cognome', ''),
                    "codice_fiscale": cf,
                    "data_nascita": emp_data.get('data_nascita'),
                    "indirizzo": emp_data.get('indirizzo'),
                    "telefono": emp_data.get('telefono'),
                    "email": emp_data.get('email'),
                    "iban": emp_data.get('iban'),
                    "mansione": emp_data.get('mansione', 'Non specificato'),
                    "qualifica": emp_data.get('qualifica'),
                    "matricola": emp_data.get('matricola'),
                    "luogo_lavoro": "Ceraldi Caffè",
                    "attivo": True,
                    "created_at": existing['created_at'] if existing else datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if existing:
                    await db.employees.update_one({"id": existing['id']}, {"$set": employee_doc})
                    updated_count += 1
                else:
                    await db.employees.insert_one(employee_doc)
                    created_count += 1
                
                # Salva nel dizionario
                await save_employee_to_dictionary(cf, employee_doc, username)
                
            except Exception as e:
                logger.error(f"⚠️ Errore importando {emp_data.get('nome')}: {str(e)}")
                continue
        
        logger.info(f"✅ Import dipendenti completato: {created_count} creati, {updated_count} aggiornati")
        
        return {
            "success": True,
            "message": f"Import completato: {created_count} creati, {updated_count} aggiornati",
            "created": created_count,
            "updated": updated_count
        }
        
    except Exception as e:
        logger.error(f"❌ Errore import employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== EMPLOYEES DICTIONARY ====================

@api_router.get("/employees/dictionary/all")
async def get_employee_dictionary(username: str = Depends(get_current_user)):
    """Get all employee dictionary"""
    try:
        entries = await db.employee_dictionary.find({}, {"_id": 0}).to_list(1000)
        return {"dictionary": entries, "total": len(entries)}
    except Exception as e:
        logger.error(f"❌ Errore get dictionary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/employees/restore-from-dictionary")
async def restore_employees_endpoint(username: str = Depends(get_current_user)):
    """Restore all employees from dictionary"""
    try:
        result = await restore_employees_from_dictionary()
        return result
    except Exception as e:
        logger.error(f"❌ Errore restore: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
