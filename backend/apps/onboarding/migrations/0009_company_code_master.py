from django.db import migrations, models


COMPANY_CODES = [
    ('R001', 'Radico Khaitan Ltd'),
    ('T001', 'N V Disti.& Brew. (P) Ltd DERABASSI, Patiala'),
    ('T002', 'Gwalior Distilleries Ltd GWALIOR'),
    ('T003', 'Welcome Dist. Pvt. Ltd Bilaspur'),
    ('T004', 'Tilaknagar Industries Ltd Tilaknagar, Ahmednagar'),
    ('T005', 'Gemini Distit(Goa) Pvt Lt Zuarinagar, Goa'),
    ('T006', 'Kamal Wineries Hyderabad'),
    ('T007', 'Ravi Kumar Distiller. Ltd Pondicherry'),
    ('T008', 'United Distilleries Ltd Calicut'),
    ('T009', 'BT & FC (P) Ltd Peenya, Banglore'),
    ('T010', 'Bacchus Bottling Pvt.Ltd. Balasore, Orissa'),
    ('T011', 'Goodhost Liquors Pvt. Ltd Begampur, Patna'),
    ('T012', 'Ajantha Distilleries Ltd. Kamptee Rd., Nagpur'),
    ('T013', 'IFB Agro Industries Ltd. Kolkatta'),
    ('T014', 'Seven Sister Trade Distil Guwahati (Assam)'),
    ('T015', 'Patiala Dist.& Mfrg Ltd. Patiala, Punjab'),
    ('T016', 'United Brothers Dist. Ltd NAHAR LAGUN'),
    ('T017', 'RK DISTILLERY 104/A, YELLAMPET T.Q,MED'),
    ('T018', 'Kapitan Distilleries HYDERABAD'),
    ('T019', 'Oakland Bottlers(P) Ltd. JAMMU'),
    ('T020', 'Sri Venkateshwara Dis.Ltd BANGLORE'),
    ('T021', 'Silver Star Distillery DAMAN'),
    ('T022', 'Gemini(Jharkhand) Jharkhand'),
    ('T023', 'Devikolam Distilleries KOCHI'),
    ('T024', 'Anab-e-Shahi HYDERABAD'),
    ('T025', 'Bhatiawine MerchantsPvtLtd Bilaspur'),
    ('T026', 'WHYTE HALL LTD. RAMPUR'),
    ('T027', 'Gowthami Agro Industries VANGURU (V) PEDAVEGI (M)'),
    ('T028', 'Prashant Impex Pvt.Lt Kolkatta'),
    ('T029', 'Chitwan Blend.& Bottl P.L Danapur, Patna'),
    ('T030', 'Indo Assam Distil & Bottl Guwahati (Assam)'),
    ('T031', 'North East Bottling Baridua(Meghalaya)'),
    ('T032', 'BMSS Ltd Sreepur, Solapur, MAH'),
    ('T033', 'NEW INDIA DISTILLERIES SUJWAN, NAI BASTI,JAMMU'),
    ('T034', 'RLPL, Derabasi DERABASSI,mohali, Punjab'),
    ('T035', 'Unmokoti Bottlg and Bevrg Tripura'),
    ('T036', 'Apollo Alco bev Pvt. Ltd Banglore'),
    ('T037', 'Himalayan Gold Beverages Nalagarh, HP'),
    ('T038', 'RNVDML- TUU AURANGABAD'),
    ('T039', 'SouthernAgrifuraneIndPLtd Villupuram, Tamilnadu'),
    ('T040', 'Diamond Bottling company Boldi, Burdwan, WB'),
    ('T041', 'Polson Distillery Muringoor, Trissur, Keral'),
    ('T042', 'Liquors India Ltd Andhra pradesh'),
    ('T043', 'SNJ Distillers Pvt Ltd Kanchipuram, Tamilnadu'),
    ('T044', 'Durga Liquor India Pvt Lt 615 Babukhan Estate, Hyd'),
    ('T045', 'Nethravathi Dist. Pvt.Ltd BANGLORE'),
    ('T046', 'GSB AND CO Sundaraya pet'),
    ('T047', 'Rajasthan Liquors Ltd. DERABASSI'),
    ('T048', 'Golden Vats Private Ltd Karnavur'),
    ('T049', 'BAGGA DISTILLERIES HYDERABAD'),
    ('T050', 'WALES DISTILLER PVT LTD KALYANI'),
    ('T051', 'KhodayIndustries(Hyd)PLtd HYDERABAD'),
    ('T052', 'Khoday Inds( Kuppam)P Ltd KUPPAM'),
    ('T053', 'Passion Beverages PvtLtd HOOGLY'),
    ('T054', 'MohanBreweries&Dist Ltd CHENNAI'),
    ('T055', 'MohanBreweries&Dist Ltd CHITTOOR'),
    ('T056', 'Kalpatharu Brew&DistPLtd BENGALORE'),
    ('T057', 'SRILAB BREWERIES P LTD Ranchi'),
    ('T058', 'BENGAL WINES PRIVATE Ltd Hoogly'),
    ('T059', 'MDH BEVERAGES PVT LTD SHILLONG'),
    ('T060', 'GoldenPrinceWinesIndiaPLt KANTIGADIA'),
    ('T061', 'KALS DIST CARNATAKA P LTD BANGLORE'),
    ('T062', 'Sikkim Distilleries Ltd RANGPO'),
    ('T063', 'VINDESHWARI EXIM PVT LTD Village Dadua'),
    ('T064', 'WOODPECKER DIST&BREW PLTD'),
    ('T065', 'SIFARUH GRP OF INDUSTRIES,JH'),
    ('T066', 'PARADISE DIST P LTD'),
    ('T067', 'High Queen Distrs&BotPLtd'),
    ('T068', 'Saffron Beverages Pvt ltd'),
    ('T069', 'SHIKA DIST&BOTTLERS P LTD'),
    ('T070', 'TARANGNI dist PORG'),
    ('T071', 'Currently Not Available'),
    ('T072', 'Currently Not Available'),
    ('T073', 'Currently Not Available'),
    ('T074', 'Currently Not Available'),
    ('T075', 'Currently Not Available'),
    ('T076', 'Currently Not Available'),
]


def seed_company_codes(apps, schema_editor):
    CompanyCodeMaster = apps.get_model('onboarding', 'CompanyCodeMaster')
    for company_code, name in COMPANY_CODES:
        CompanyCodeMaster.objects.update_or_create(
            company_code=company_code,
            defaults={'name': name},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('onboarding', '0008_purchase_organization_master'),
    ]

    operations = [
        migrations.AddField(
            model_name='onboarding',
            name='company_code_to_open',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.CreateModel(
            name='CompanyCodeMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company_code', models.CharField(max_length=20, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'company_code_masters',
                'ordering': ['company_code'],
            },
        ),
        migrations.RunPython(seed_company_codes, migrations.RunPython.noop),
    ]
