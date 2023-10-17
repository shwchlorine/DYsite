import { FC } from 'react';
import {
    Container,
    VStack,
    Stack,
    Heading,
    StackDivider,
    useColorModeValue,
    Box
} from '@chakra-ui/react'
import {
    SiFlask,
    SiHtml5,
    SiJava,
    SiPhp,
    SiPython,
    SiReact,
    SiTypescript,
    SiBootstrap,
    SiMysql,
    SiMongodb,
    SiVisualstudiocode,
    SiGit,
    SiLatex,
    SiDocker,
    SiGo,
    SiNodedotjs,
    SiPostgresql,
    SiC,
    SiFirebase,
    SiCsharp,
    SiDotnet,
    SiAmazonaws,
    SiTailwindcss,
    SiChakraui
} from 'react-icons/si';
import { Element } from 'react-scroll';
import Fade from 'react-reveal/Fade';
import SkillSection from './SkillSection';
import SkillItem from './SkillItem';

const Skills: FC = () => {
    return (
        <Element name='skills'>
            <Container maxW={'5xl'} p={6.5} mt={20}>
                <VStack spacing={8}>
                    <Fade>
                        <Heading as='h2'>Skills</Heading>
                    </Fade>
                    <Fade bottom cascade duration={500}>
                        <Box>
                            <Stack direction={'row'}>
                                <Stack
                                    direction={['column', 'row']}
                                    divider={
                                        <StackDivider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                                    }
                                    spacing={8}
                                    align={'flex-start'}
                                    bg={useColorModeValue('white', 'gray.900')}
                                    opacity={0.9}
                                    p={5}
                                    rounded={'xl'}
                                    boxShadow={'lg'}
                                >
                                    <SkillSection title={'CRM'}>
                                        <SkillItem icon={SiPython} name='Salesforce' />
                                        <SkillItem icon={SiTypescript} name='Notion' />
                                        <SkillItem icon={SiPhp} name='Jira' />
                                        <SkillItem icon={SiJava} name='Pipdrive' />
                                        <SkillItem icon={SiPhp} name='Photoshop' />
                                    </SkillSection>
                                    <SkillSection title={'No-Code'}>
                                        <SkillItem icon={SiReact} name='Webflow' />
                                        <SkillItem icon={SiNodedotjs} name='Figma' />
                                        <SkillItem icon={SiDotnet} name='Bubble' />
                                        <SkillItem icon={SiFlask} name='Airtable' />
                                        <SkillItem icon={SiChakraui} name='Zapier' />
                                    </SkillSection>
                                </Stack>
                                <Stack
                                    direction={['column', 'row']}
                                    divider={
                                        <StackDivider borderColor={useColorModeValue('gray.300', 'gray.600')} />
                                    }
                                    spacing={8}
                                    align={'flex-start'}
                                    bg={useColorModeValue('white', 'gray.900')}
                                    opacity={0.9}
                                    p={5}
                                    rounded={'xl'}
                                    boxShadow={'lg'}
                                >
                                    <SkillSection title={'Backend'}>
                                        <SkillItem icon={SiMysql} name='Google Analytics' />
                                        <SkillItem icon={SiPostgresql} name='SEO' />
                                        <SkillItem icon={SiMongodb} name='AWS' />
                                    </SkillSection>
                                    <SkillSection title={'Languages'}>
                                        <SkillItem icon={SiGit} name='English' />
                                        <SkillItem icon={SiLatex} name='Chinese' />
                                    </SkillSection>
                                </Stack>
                            </Stack>
                        </Box>
                    </Fade>
                </VStack>
            </Container>
        </Element>
    );
};

export default Skills;