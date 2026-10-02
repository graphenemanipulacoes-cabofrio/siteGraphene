// Identity transcribed from the supplied CRF-RJ certificate and AFE publication.
// Public opening hours were separately confirmed by the business owner.
export const business = {
    name: 'Graphène Manipulações',
    legalName: 'MEDEIROS CORDEIRO FARMACIA LTDA',
    cnpj: '50.380.346/0001-30',
    address: {
        street: 'Rua Itajuru, 300, Lojas 5 e 6',
        neighborhood: 'Centro',
        city: 'Cabo Frio',
        region: 'RJ',
        country: 'BR',
    },
    telephone: '+55-22-99936-1256',
    instagram: 'https://www.instagram.com/graphene_manipulacoes',
    hours: {
        weekdays: '08h – 18h30',
        saturday: '08h – 13h',
        specifications: [
            { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:30' },
            { dayOfWeek: 'Saturday', opens: '08:00', closes: '13:00' },
        ],
    },
    pharmacist: {
        name: 'Beatriz Marinho Medeiros Cardozo Nogueira',
        registration: '35302',
    },
    establishmentRegistration: '27915',
    certificate: { issued: '05/05/2026', validUntil: '30/04/2027' },
    afe: {
        number: '5064856',
        process: '25351.922127/2024-16',
        resolution: 'RE nº 276, de 24/01/2024',
        publication: '25/01/2024',
    },
};
