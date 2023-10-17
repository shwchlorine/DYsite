import { HStack, Link } from '@chakra-ui/react';
import React, { FC } from 'react';
import {
    FiLinkedin,
    FiGithub,
    FiMail
} from 'react-icons/fi'

interface SocialsProps {
    color: string,
    size?: string
}

const Socials: FC<SocialsProps> = (props) => {
    const socialsData = [
        {
            aria: 'Linkedin',
            icon: <FiLinkedin />,
            href: 'https://www.linkedin.com/in/derrick-yen/'
        },
        {
            aria: 'Email',
            icon: <FiMail />,
            href: 'mailto:dyen2018@gmail.com'
        }
    ]
    return (
        <HStack spacing={6}>
            {
                socialsData.map((social, i) => (
                    <Link
                        key={i}
                        aria-label={social.aria}
                        href={social.href}
                        fontSize={props.size ? props.size : '1.5rem'}
                        color={props.color}
                        isExternal
                    >
                        {social.icon}
                    </Link>
                ))
            }
        </HStack>
    );
};

export default Socials;