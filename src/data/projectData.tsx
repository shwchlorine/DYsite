
import { FiLink } from 'react-icons/fi';
import { ReactElement } from 'react';

export interface LinkT {
    link: string,
    icon: ReactElement
}

export interface ProjectT {
    name?: string,
    id?: string,
    type?: string,
    tags?: ReactElement[],
    tagline?: string,
    imageSrc?: string,
    description?: string,
    links?: LinkT[],
    headerLink?: string
}

export const projectData: ProjectT[] = [
    {
        name: 'BingX Exchange',
        id: 'street-savvy',
        type: '2023-Present',
        tagline: 'Business Development Executive',
      
        imageSrc: '/Bingx.png',
        description: 'BingX is a global digital asset, spot, and derivatives trading platform that provides a user-centric and open ecosystem with intuitive social trading features.',
        links: [
            {
                link: 'bingx.com',
                icon: <FiLink />
            }
        ],
        headerLink: 'https://bingx.com'
    },
    {
        name: 'DigiWorld',
        id: 'twitter-geo-sentiment',
        type: '2022-Present',
        tagline: 'Product Manager',
       
        imageSrc: '/Digiworld.png',
        description: 'Digiworld is a pioneering Web3 platform that establishes partnerships with diverse projects, curates a unique NFT collection, and manages a consortium of crypto investors.',
        links: [
            {
                link: 'https://opensea.io/assets/ethereum/0x46fde27b3c65143e7670729517051d7f6dadcaf7/1',
                icon: <FiLink />
            }
        ],
        headerLink: 'https://opensea.io/assets/ethereum/0x46fde27b3c65143e7670729517051d7f6dadcaf7/1'
    },
    {
        name: 'Wonghaus Ventures',
        id: 'fourier-series',
        type: 'E-Commerce',
        tagline: 'Product Manager',
      
        imageSrc: '/Wonghaus.png',
        description: 'Wonghaus Ventures is a digital strategy firm specializing in affiliate marketing, e-commerce community building, and providing startups with comprehensive e-commerce and digital marketing solutions.',
        links: [
            {
                link: 'https://www.bbclass.co/',
                icon: <FiLink />
            }
            
        ],
        headerLink: 'https://www.bbclass.co/'
    },
    {
        name: 'Baronford & Associates',
        id: 'orbital-sim',
        type: 'Oct 2019 - Aug 2019',
        tagline: 'Consultant',
 
        imageSrc: '/orbital-sim.png',
        description: 'Baronford & Associates is a consultancy firm focused on digital transformation, supply chain management, and facilitating strategic investments for startups in the global market.',
    },
    {
        name: 'New Omni Bank',
        id: 'plismun',
        type: 'May 2019 - Aug 2019',
        tagline: 'Summer Analyst',

        imageSrc: 'New omni.jpg',
        description: 'New Omni Bank is a financial institution specializing in digital and mobile banking solutions, catering to both US and China markets with an emphasis on cross-platform integrations.',
        links: [
            {
                link: 'https://www.newomnibank.com/',
                icon: <FiLink />
            }
        ],
        headerLink: 'https://www.newomnibank.com/'
    },
]